package expo.modules.ocrnative

import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/**
 * Cell preprocessing ported from the authors' `BlankOCRScanner.classify_cell`
 * (blank_pipeline.py, commit 796601e); reference: tools/ocr-lab/preprocess_server.py.
 * Pixel data stays in native memory: input and output are Mats/arrays owned by the caller.
 *
 * Python semantics reproduced on purpose: banker's rounding (Math.rint), numpy linear-interpolated
 * percentiles, numpy median (mean of the two middle values for even counts), float64 arithmetic in
 * the contrast stretch with truncation to uint8.
 */
object CellPreprocessor {
  const val SIZE = 64
  private const val CANVAS_FILL = 250

  class Result(val inp64: ByteArray, val isEmpty: Boolean, val inkPixels: Int = 0)

  /** [gray] is an 8-bit single-channel Mat; it is not modified. */
  /**
   * [tolerantLines] = false is the authors' exact rule (edge line: thickness <= 3 px). true also treats
   * thin, long strips (thickness <= 8 px spanning > 70% of the cell) as printed-line remnants: on real
   * photos the printed 0.4 mm lines come out 4-5 px thick and were read as letters (name field, 5 of 16
   * empty cells) — spike evidence `paper-handwriting.md`. Used by the app path; the golden parity test
   * keeps the exact rule.
   */
  fun preprocess(gray: Mat, marginTrimPct: Int = 8, tolerantLines: Boolean = false): Result {
    val ch = gray.rows()
    val cw = gray.cols()
    if (ch < 10 || cw < 10) return empty()

    val my = max(1, Math.rint(ch * (marginTrimPct / 100.0)).toInt())
    val mx = max(1, Math.rint(cw * (marginTrimPct / 100.0)).toInt())
    val ih = ch - 2 * my
    val iw = cw - 2 * mx
    if (ih < 8 || iw < 8) return empty()

    val inner = gray.submat(my, ch - my, mx, cw - mx)
    val innerBytes = ByteArray(ih * iw)
    inner.get(0, 0, innerBytes)
    inner.release()

    val bg = numpyMedian(innerBytes)
    val threshold = bg - 22.0
    val ink = ByteArray(ih * iw)
    for (i in innerBytes.indices) ink[i] = if ((innerBytes[i].toInt() and 0xFF) < threshold) 1 else 0

    val inkMat = Mat(ih, iw, CvType.CV_8UC1)
    inkMat.put(0, 0, ink)
    val labels = Mat()
    val stats = Mat()
    val centroids = Mat()
    val n = Imgproc.connectedComponentsWithStats(inkMat, labels, stats, centroids, 8, CvType.CV_32S)
    inkMat.release(); centroids.release()
    if (n <= 1) { labels.release(); stats.release(); return empty() }

    val labelData = IntArray(ih * iw)
    labels.get(0, 0, labelData)
    val statData = IntArray(n * 5)
    stats.get(0, 0, statData)
    labels.release(); stats.release()

    val keep = BooleanArray(n)
    var total = 0
    for (i in 1 until n) {
      val bw = statData[i * 5 + Imgproc.CC_STAT_WIDTH]
      val bh = statData[i * 5 + Imgproc.CC_STAT_HEIGHT]
      val area = statData[i * 5 + Imgproc.CC_STAT_AREA]
      val isEdgeLine = if (tolerantLines) {
        (bw > 0.7 * iw && bh <= 8) || (bh > 0.7 * ih && bw <= 8)
      } else {
        (bw > 0.88 * iw && bh <= 3) || (bh > 0.88 * ih && bw <= 3)
      }
      if (area >= 18 && !isEdgeLine) { keep[i] = true; total += area }
    }
    if (total < 30) return empty()

    var minX = Int.MAX_VALUE; var maxX = -1; var minY = Int.MAX_VALUE; var maxY = -1
    for (y in 0 until ih) for (x in 0 until iw) {
      if (keep[labelData[y * iw + x]]) {
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }
    }
    if (maxX < 0) return empty()

    val pad = 2
    val x1 = max(0, minX - pad); val y1 = max(0, minY - pad)
    val x2 = min(iw - 1, maxX + pad); val y2 = min(ih - 1, maxY + pad)
    val gw = x2 - x1 + 1
    val gh = y2 - y1 + 1

    val glyph = Mat(ih, iw, CvType.CV_8UC1).also { it.put(0, 0, innerBytes) }.let { full ->
      val sub = full.submat(y1, y2 + 1, x1, x2 + 1).clone()
      full.release(); sub
    }

    val scale = 46.0 / (max(gh, gw) + 1e-5)
    val newW = max(1, min(60, Math.rint(gw * scale).toInt()))
    val newH = max(1, min(60, Math.rint(gh * scale).toInt()))
    val interp = if (scale < 1.0) Imgproc.INTER_AREA else Imgproc.INTER_LANCZOS4
    val resized = Mat()
    Imgproc.resize(glyph, resized, Size(newW.toDouble(), newH.toDouble()), 0.0, 0.0, interp)
    glyph.release()

    val rBytes = ByteArray(newW * newH)
    resized.get(0, 0, rBytes)
    resized.release()

    val sorted = IntArray(rBytes.size) { rBytes[it].toInt() and 0xFF }.also { it.sort() }
    val pLo = numpyPercentile(sorted, 2.0)
    val pHi = numpyPercentile(sorted, 98.0)

    val out = ByteArray(SIZE * SIZE) { CANVAS_FILL.toByte() }
    val offX = (SIZE - newW) / 2
    val offY = (SIZE - newH) / 2
    for (y in 0 until newH) for (x in 0 until newW) {
      val v = (rBytes[y * newW + x].toInt() and 0xFF).toDouble()
      val stretched = (v - pLo) / (pHi - pLo + 1e-5) * 240.0 + 10.0
      out[(offY + y) * SIZE + offX + x] = stretched.coerceIn(0.0, 255.0).toInt().toByte()
    }
    return Result(out, false, total)
  }

  /** (x / 255 - 0.5) / 0.5 in float32, as numpy does for a float32 array with python floats. */
  fun toTensor(inp64: ByteArray, dst: FloatArray, offset: Int) {
    for (i in 0 until SIZE * SIZE) {
      dst[offset + i] = ((inp64[i].toInt() and 0xFF) / 255f - 0.5f) / 0.5f
    }
  }

  private fun empty() = Result(ByteArray(SIZE * SIZE) { CANVAS_FILL.toByte() }, true)

  /** numpy.median on uint8 values: mean of the two middle values when the count is even. */
  private fun numpyMedian(values: ByteArray): Double {
    val hist = IntArray(256)
    for (b in values) hist[b.toInt() and 0xFF]++
    val n = values.size
    fun kth(k: Int): Int {
      var seen = 0
      for (v in 0..255) { seen += hist[v]; if (seen > k) return v }
      return 255
    }
    return if (n % 2 == 1) kth(n / 2).toDouble() else (kth(n / 2 - 1) + kth(n / 2)) / 2.0
  }

  /** numpy.percentile, method "linear", on an ascending-sorted array. */
  private fun numpyPercentile(sorted: IntArray, q: Double): Double {
    val pos = q / 100.0 * (sorted.size - 1)
    val lo = floor(pos).toInt()
    val hi = min(lo + 1, sorted.size - 1)
    val t = pos - lo
    val a = sorted[lo].toDouble()
    val b = sorted[hi].toDouble()
    // numpy `_lerp`: a + (b - a) * t, switching to b - (b - a) * (1 - t) for t >= 0.5
    return if (t >= 0.5) b - (b - a) * (1 - t) else a + (b - a) * t
  }

  fun grayOf(bgrOrGray: Mat): Mat {
    if (bgrOrGray.channels() == 1) return bgrOrGray.clone()
    val g = Mat()
    Imgproc.cvtColor(bgrOrGray, g, if (bgrOrGray.channels() == 4) Imgproc.COLOR_BGRA2GRAY else Imgproc.COLOR_BGR2GRAY)
    return g
  }
}
