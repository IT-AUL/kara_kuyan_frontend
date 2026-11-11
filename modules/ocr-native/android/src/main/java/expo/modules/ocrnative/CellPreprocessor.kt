package expo.modules.ocrnative

import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/**
 * Cell preprocessing ported 1:1 from `BlankOCRScanner.classify_cell` (`DanisGaleev/tatar_ocr@7a5cce4`, v4 pipeline):
 * - 4% (`min 5 px`) inner margin trim (prevents clipping wide glyphs `Ш, Щ, Ж, Җ, М, Ю`)
 * - Contrast-adaptive ink threshold (`22 / 16 / max(7, 0.32 * Δ)`) for faint pens & pencils
 * - Hollow perimeter box + border remnant pre-filtering
 * - Top-diacritic component re-attachment (`<= 22 px` above body for `Ё`, `Й`)
 * - 4-criterion empty-cell filter (`ink < 35`, `coreFrac < 0.005`, `Blackhat P98 < 10 & contrast < 25`, top-band intrusion)
 * - Aspect-preserving scale to `48 px` (`75%` occupancy of `64×64`), P2..P98 contrast stretch, centered on `250` canvas
 * - Geometric `hasTopDiacritic` flag for Stage 6 deterministic `Ё`/`Й` post-filtering.
 *
 * All pixel buffers stay strictly inside native memory (ADR 0003).
 */
object CellPreprocessor {
  const val SIZE = 64
  private const val CANVAS_FILL = 250
  private const val TARGET_DIM = 48.0

  class Result(
    val inp64: ByteArray,
    val isEmpty: Boolean,
    val inkPixels: Int = 0,
    val hasTopDiacritic: Boolean = false,
  )

  /** [gray] is an 8-bit single-channel Mat; it is not modified. */
  fun preprocess(gray: Mat, marginTrimPct: Int = 4): Result {
    val ch = gray.rows()
    val cw = gray.cols()
    if (ch < 10 || cw < 10) return empty()

    val my = if (marginTrimPct > 0) max(5, Math.rint(ch * (marginTrimPct / 100.0)).toInt()) else 0
    val mx = if (marginTrimPct > 0) max(5, Math.rint(cw * (marginTrimPct / 100.0)).toInt()) else 0
    val useTrim = my > 0 && mx > 0 && (ch - 2 * my) >= 8 && (cw - 2 * mx) >= 8
    val inner = if (useTrim) gray.submat(my, ch - my, mx, cw - mx) else gray.submat(0, ch, 0, cw)
    val ih = inner.rows()
    val iw = inner.cols()
    if (ih < 8 || iw < 8) {
      inner.release()
      return empty()
    }

    val innerBytes = ByteArray(ih * iw)
    inner.get(0, 0, innerBytes)
    inner.release()

    // 1. Adaptive contrast ink segmentation
    val bgVal = numpyMedian(innerBytes)
    val sortedInner = IntArray(innerBytes.size) { innerBytes[it].toInt() and 0xFF }.also { it.sort() }
    val p5Val = numpyPercentile(sortedInner, 5.0)
    val contrastRange = bgVal - p5Val
    val inkDelta = when {
      contrastRange > 60.0 -> 22.0
      contrastRange > 35.0 -> 16.0
      else -> max(7.0, 0.32 * contrastRange)
    }
    val threshold = bgVal - inkDelta
    val ink = ByteArray(ih * iw)
    for (i in innerBytes.indices) {
      ink[i] = if ((innerBytes[i].toInt() and 0xFF) < threshold) 1 else 0
    }

    val inkMat = Mat(ih, iw, CvType.CV_8UC1)
    inkMat.put(0, 0, ink)
    val labels = Mat()
    val stats = Mat()
    val centroids = Mat()
    val nLabels = Imgproc.connectedComponentsWithStats(inkMat, labels, stats, centroids, 8, CvType.CV_32S)
    inkMat.release()
    centroids.release()
    if (nLabels <= 1) {
      labels.release()
      stats.release()
      return empty()
    }

    val labelData = IntArray(ih * iw)
    labels.get(0, 0, labelData)
    val statData = IntArray(nLabels * 5)
    stats.get(0, 0, statData)
    labels.release()
    stats.release()

    // 2. Pre-filter hollow perimeter boxes and border line remnants
    val candidates = ArrayList<Int>()
    for (i in 1 until nLabels) {
      val bx = statData[i * 5 + Imgproc.CC_STAT_LEFT]
      val by = statData[i * 5 + Imgproc.CC_STAT_TOP]
      val bw = statData[i * 5 + Imgproc.CC_STAT_WIDTH]
      val bh = statData[i * 5 + Imgproc.CC_STAT_HEIGHT]
      val area = statData[i * 5 + Imgproc.CC_STAT_AREA]

      val isHollowBox =
        bx <= 3 && by <= 3 && (bx + bw) >= iw - 3 && (by + bh) >= ih - 3 &&
          area < 0.12 * (bw * bh)

      val isEdge =
        isHollowBox ||
          (bw > 0.35 * iw && bh <= 8 && (by <= 4 || by + bh >= ih - 4)) ||
          (bh > 0.35 * ih && bw <= 8 && (bx <= 4 || bx + bw >= iw - 4)) ||
          (bh > 0.60 * ih && bw <= 12 && (bx <= 2 || bx + bw >= iw - 2)) ||
          (bw > 0.60 * iw && bh <= 12 && (by <= 2 || by + bh >= ih - 2)) ||
          ((bx <= 3 || by <= 3 || bx + bw >= iw - 3 || by + bh >= ih - 3) && (bw <= 5 || bh <= 5) && area < 40)

      if (!isEdge) candidates.add(i)
    }
    if (candidates.isEmpty()) return empty()

    var bestIdx = candidates[0]
    var maxCompArea = statData[bestIdx * 5 + Imgproc.CC_STAT_AREA]
    for (idx in candidates) {
      val a = statData[idx * 5 + Imgproc.CC_STAT_AREA]
      if (a > maxCompArea) {
        maxCompArea = a
        bestIdx = idx
      }
    }
    if (maxCompArea < 20) return empty()

    val mbx = statData[bestIdx * 5 + Imgproc.CC_STAT_LEFT]
    val mby = statData[bestIdx * 5 + Imgproc.CC_STAT_TOP]
    val mbw = statData[bestIdx * 5 + Imgproc.CC_STAT_WIDTH]
    val mbh = statData[bestIdx * 5 + Imgproc.CC_STAT_HEIGHT]

    // 3. Re-attach secondary strokes & top diacritics (Ё dots, Й breve)
    val keep = BooleanArray(nLabels)
    keep[bestIdx] = true
    var totalInkPixels = maxCompArea

    for (i in candidates) {
      if (i == bestIdx) continue
      val area = statData[i * 5 + Imgproc.CC_STAT_AREA]
      val bx = statData[i * 5 + Imgproc.CC_STAT_LEFT]
      val by = statData[i * 5 + Imgproc.CC_STAT_TOP]
      val bw = statData[i * 5 + Imgproc.CC_STAT_WIDTH]
      val bh = statData[i * 5 + Imgproc.CC_STAT_HEIGHT]

      val isTopDiacritic =
        (by + bh) <= (mby + 5) &&
          (mby - (by + bh)) <= 22 &&
          (bx + bw) >= (mbx - 6) &&
          bx <= (mbx + mbw + 6) &&
          bw < 0.60 * iw

      val nearBorder = bx <= 2 || by <= 2 || (bx + bw) >= iw - 2 || (by + bh) >= ih - 2
      if (nearBorder && !isTopDiacritic && area < 0.35 * maxCompArea) continue

      val distX = max(0, max(bx - (mbx + mbw), mbx - (bx + bw)))
      val distY = max(0, max(by - (mby + mbh), mby - (by + bh)))
      if (!isTopDiacritic && (distX > 10 || distY > 10) && area < 0.25 * maxCompArea) continue
      if (area < 8 && !isTopDiacritic) continue

      keep[i] = true
      totalInkPixels += area
    }

    if (totalInkPixels < 35) return empty()

    // 4. Scale-free core, Blackhat shadow & top-band intrusion emptiness filter
    val validInk = ByteArray(ih * iw)
    var minX = Int.MAX_VALUE
    var maxX = -1
    var minY = Int.MAX_VALUE
    var maxY = -1
    val cy = Math.rint(0.15 * ih).toInt()
    val cx = Math.rint(0.15 * iw).toInt()
    val y40 = Math.rint(0.40 * ih).toInt()
    var coreCount = 0
    var lowCoreCount = 0
    var topBandCount = 0
    val strokeGrayValues = IntArray(totalInkPixels)
    var strokeCursor = 0

    for (y in 0 until ih) {
      for (x in 0 until iw) {
        val idx = y * iw + x
        if (keep[labelData[idx]]) {
          validInk[idx] = 1
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
          if (y in cy until (ih - cy) && x in cx until (iw - cx)) coreCount++
          if (y in y40 until (ih - cy) && x in cx until (iw - cx)) lowCoreCount++
          if (y < y40) topBandCount++
          if (strokeCursor < strokeGrayValues.size) {
            strokeGrayValues[strokeCursor++] = innerBytes[idx].toInt() and 0xFF
          }
        }
      }
    }
    if (maxX < 0) return empty()

    val areaTotal = (ih * iw).toDouble()
    val coreFrac = coreCount / areaTotal
    if (coreFrac < 0.005) return empty()

    val inkW = (maxX - minX + 1) / iw.toDouble()
    val lowCoreFrac = lowCoreCount / areaTotal
    val topRatio = topBandCount / max(1, totalInkPixels).toDouble()
    if (inkW >= 0.92 && lowCoreFrac < 0.010 && topRatio > 0.45) return empty()

    strokeGrayValues.sort(0, strokeCursor)
    val inkMedian = if (strokeCursor == 0) bgVal else if (strokeCursor % 2 == 1) {
      strokeGrayValues[strokeCursor / 2].toDouble()
    } else {
      (strokeGrayValues[strokeCursor / 2 - 1] + strokeGrayValues[strokeCursor / 2]) / 2.0
    }
    val inkContrast = bgVal - inkMedian

    val innerMat = Mat(ih, iw, CvType.CV_8UC1).also { it.put(0, 0, innerBytes) }
    if (inkContrast < 25.0) {
      val bhK = max(9, Math.rint(0.25 * min(ih, iw)).toInt() or 1)
      val bhKernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(bhK.toDouble(), bhK.toDouble()))
      val blackhat = Mat()
      Imgproc.morphologyEx(innerMat, blackhat, Imgproc.MORPH_BLACKHAT, bhKernel)
      bhKernel.release()
      val coreH = max(1, ih - 2 * cy)
      val coreW = max(1, iw - 2 * cx)
      val coreBh = blackhat.submat(cy, min(ih, cy + coreH), cx, min(iw, cx + coreW))
      val bhBytes = ByteArray(coreBh.rows() * coreBh.cols())
      coreBh.get(0, 0, bhBytes)
      coreBh.release()
      blackhat.release()
      val sortedBh = IntArray(bhBytes.size) { bhBytes[it].toInt() and 0xFF }.also { it.sort() }
      val coreBhP98 = numpyPercentile(sortedBh, 98.0)
      if (coreBhP98 < 10.0) {
        innerMat.release()
        return empty()
      }
    }

    // 5. Geometric top-diacritic verification on validInk (used for Stage 6 Ё/Й constraint)
    var hasTopDiacritic = false
    val validMat = Mat(ih, iw, CvType.CV_8UC1).also { it.put(0, 0, validInk) }
    val vLabels = Mat()
    val vStats = Mat()
    val vCentroids = Mat()
    val vn = Imgproc.connectedComponentsWithStats(validMat, vLabels, vStats, vCentroids, 8, CvType.CV_32S)
    validMat.release()
    vLabels.release()
    vCentroids.release()
    if (vn > 2) {
      val vs = IntArray(vn * 5)
      vStats.get(0, 0, vs)
      var mainIdx = 1
      var mainArea = vs[1 * 5 + Imgproc.CC_STAT_AREA]
      for (i in 2 until vn) {
        val a = vs[i * 5 + Imgproc.CC_STAT_AREA]
        if (a > mainArea) {
          mainArea = a
          mainIdx = i
        }
      }
      val mainTop = vs[mainIdx * 5 + Imgproc.CC_STAT_TOP]
      for (i in 1 until vn) {
        if (i == mainIdx) continue
        val cTop = vs[i * 5 + Imgproc.CC_STAT_TOP]
        val cH = vs[i * 5 + Imgproc.CC_STAT_HEIGHT]
        val cArea = vs[i * 5 + Imgproc.CC_STAT_AREA]
        if ((cTop + cH) <= mainTop + 2 && cArea >= 10) {
          hasTopDiacritic = true
          break
        }
      }
    }
    vStats.release()

    // 6. Crop glyph + 2px cushion, scale to 48px (75% occupancy), P2..P98 stretch, center on 64x64
    val pad = 2
    val x1 = max(0, minX - pad)
    val y1 = max(0, minY - pad)
    val x2 = min(iw - 1, maxX + pad)
    val y2 = min(ih - 1, maxY + pad)
    val gw = x2 - x1 + 1
    val gh = y2 - y1 + 1

    val glyph = innerMat.submat(y1, y2 + 1, x1, x2 + 1).clone()
    innerMat.release()

    val scale = TARGET_DIM / (max(gh, gw) + 1e-5)
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
    for (y in 0 until newH) {
      for (x in 0 until newW) {
        val v = (rBytes[y * newW + x].toInt() and 0xFF).toDouble()
        val stretched = (v - pLo) / (pHi - pLo + 1e-5) * 240.0 + 10.0
        out[(offY + y) * SIZE + offX + x] = stretched.coerceIn(0.0, 255.0).toInt().toByte()
      }
    }
    return Result(out, false, totalInkPixels, hasTopDiacritic)
  }

  /** ((x / 255) - 0.5) / 0.5 in float32. */
  fun toTensor(inp64: ByteArray, dst: FloatArray, offset: Int) {
    for (i in 0 until SIZE * SIZE) {
      dst[offset + i] = ((inp64[i].toInt() and 0xFF) / 255f - 0.5f) / 0.5f
    }
  }

  private fun empty() = Result(ByteArray(SIZE * SIZE) { CANVAS_FILL.toByte() }, true)

  private fun numpyMedian(values: ByteArray): Double {
    val hist = IntArray(256)
    for (b in values) hist[b.toInt() and 0xFF]++
    val n = values.size
    fun kth(k: Int): Int {
      var seen = 0
      for (v in 0..255) {
        seen += hist[v]
        if (seen > k) return v
      }
      return 255
    }
    return if (n % 2 == 1) kth(n / 2).toDouble() else (kth(n / 2 - 1) + kth(n / 2)) / 2.0
  }

  private fun numpyPercentile(sorted: IntArray, q: Double): Double {
    if (sorted.isEmpty()) return 0.0
    val pos = q / 100.0 * (sorted.size - 1)
    val lo = floor(pos).toInt()
    val hi = min(lo + 1, sorted.size - 1)
    val t = pos - lo
    val a = sorted[lo].toDouble()
    val b = sorted[hi].toDouble()
    return if (t >= 0.5) b - (b - a) * (1 - t) else a + (b - a) * t
  }

  fun grayOf(bgrOrGray: Mat): Mat {
    if (bgrOrGray.channels() == 1) return bgrOrGray.clone()
    val g = Mat()
    Imgproc.cvtColor(bgrOrGray, g, if (bgrOrGray.channels() == 4) Imgproc.COLOR_BGRA2GRAY else Imgproc.COLOR_BGR2GRAY)
    return g
  }
}
