package expo.modules.ocrnative

import android.graphics.Bitmap
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import org.opencv.android.Utils
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.geometry.Geometry
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.ArucoDetector
import org.opencv.objdetect.DetectorParameters
import org.opencv.objdetect.Objdetect
import org.opencv.objdetect.QRCodeDetector
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Sheet geometry ported 1:1 from `BlankOCRScanner` (`DanisGaleev/tatar_ocr@7a5cce4`, v4 pipeline):
 * - Stage 1 (`rectify`): 60px white-padded 3-pass ArUco cascade (`CORNER_REFINE_SUBPIX`, C=7 -> C=12 -> CLAHE),
 *   exact 4-corner perspective warp, balanced multi-marker RANSAC homography, or 4-DOF RANSAC similarity
 *   fallback (`marker-similarity`) when corner markers are shadowed.
 * - Stage 2 (`locate`): `MORPH_CLOSE` (9x1, 1x9) + long-kernel `MORPH_OPEN` (180x1, 1x50) grid line snapping,
 *   15 student-name cells, and dynamic 8..12 cells per question row across `1..maxQ`.
 * - Stage 3 (`suppressGridBorders`): non-destructive printed border erasure strictly outside the inner 84%
 *   protected core of every cell.
 *
 * Frames/crops never leave native memory (ADR 0003).
 */
class SheetPipeline {
  companion object {
    const val CANVAS_W = 2100
    const val CANVAS_H = 2970

    private val CANONICAL_ANCHORS = mapOf(
      11 to Point(130.0, 494.0),
      12 to Point(130.0, 770.0),
      13 to Point(128.0, 1045.0),
      14 to Point(125.0, 1320.0),
      15 to Point(125.0, 1595.0),
      16 to Point(125.0, 1872.0),
      17 to Point(125.0, 2150.0),
      18 to Point(125.0, 2428.0),
    )
  }

  data class Box(val x: Int, val y: Int, val w: Int, val h: Int)
  data class Row(val markerId: Int, val boxes: List<Box>)

  private val dict = Objdetect.getPredefinedDictionary(Objdetect.DICT_4X4_50)

  /** Lightweight detector for 9 FPS live viewfinder alignment (no subpix overhead on budget CPUs). */
  private val fastDetector = ArucoDetector(dict, DetectorParameters())

  /** High-precision subpixel detectors for captured still sheets (3-pass cascade). */
  private val subpixDetectorPass1 = ArucoDetector(
    dict,
    DetectorParameters().apply {
      set_cornerRefinementMethod(Objdetect.CORNER_REFINE_SUBPIX)
      set_adaptiveThreshWinSizeMin(3)
      set_adaptiveThreshWinSizeMax(45)
      set_adaptiveThreshWinSizeStep(4)
      set_adaptiveThreshConstant(7.0)
    },
  )
  private val subpixDetectorPass2 = ArucoDetector(
    dict,
    DetectorParameters().apply {
      set_cornerRefinementMethod(Objdetect.CORNER_REFINE_SUBPIX)
      set_adaptiveThreshWinSizeMin(3)
      set_adaptiveThreshWinSizeMax(45)
      set_adaptiveThreshWinSizeStep(4)
      set_adaptiveThreshConstant(12.0)
    },
  )

  private val qrCv = QRCodeDetector()
  private val mlKit = BarcodeScanning.getClient(
    BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build(),
  )

  private fun templateCorners(id: Int): Array<Point>? {
    val (x, y, side) = when (id) {
      0 -> Triple(60.0, 60.0, 140.0)
      1 -> Triple(1900.0, 60.0, 140.0)
      2 -> Triple(60.0, 2770.0, 140.0)
      3 -> Triple(1900.0, 2770.0, 140.0)
      in 11..18 -> Triple(60.0, (38.0 + 28.0 * (id - 11) + 4.0) * 10.0, 110.0)
      else -> return null
    }
    return arrayOf(Point(x, y), Point(x + side, y), Point(x + side, y + side), Point(x, y + side))
  }

  /** Fast single-pass marker detection for live CameraX viewfinder. */
  fun markerCorners(img: Mat): Map<Int, Array<Point>> = runDetect(fastDetector, img, 0.0)

  /** Padded 3-pass subpixel marker detection (`blank_pipeline.py:detect_markers_padded`). */
  fun detectMarkersPadded(img: Mat, pad: Int = 60): Map<Int, Array<Point>> {
    val padded = Mat()
    val borderVal = if (img.channels() == 1) Scalar(255.0) else Scalar(255.0, 255.0, 255.0)
    Core.copyMakeBorder(img, padded, pad, pad, pad, pad, Core.BORDER_CONSTANT, borderVal)
    val offset = pad.toDouble()

    val out = HashMap<Int, Array<Point>>()
    out.putAll(runDetect(subpixDetectorPass1, padded, offset))

    if (out.size < 8) {
      for ((id, pts) in runDetect(subpixDetectorPass2, padded, offset)) {
        if (id !in out) out[id] = pts
      }
    }

    if (out.size < 8) {
      val gray = if (padded.channels() == 1) padded.clone() else Mat().also {
        Imgproc.cvtColor(padded, it, if (padded.channels() == 4) Imgproc.COLOR_BGRA2GRAY else Imgproc.COLOR_BGR2GRAY)
      }
      val clahe = Imgproc.createCLAHE(2.5, Size(8.0, 8.0))
      val enhanced = Mat()
      clahe.apply(gray, enhanced)
      gray.release()
      for ((id, pts) in runDetect(subpixDetectorPass1, enhanced, offset)) {
        if (id !in out) out[id] = pts
      }
      enhanced.release()
    }

    padded.release()
    return out
  }

  private fun runDetect(det: ArucoDetector, img: Mat, offset: Double): Map<Int, Array<Point>> {
    val corners = ArrayList<Mat>()
    val ids = Mat()
    det.detectMarkers(img, corners, ids)
    val out = HashMap<Int, Array<Point>>()
    if (ids.empty()) {
      corners.forEach { it.release() }
      ids.release()
      return out
    }
    val idArr = IntArray(ids.total().toInt())
    ids.get(0, 0, idArr)
    for (i in corners.indices) {
      val f = FloatArray(8)
      corners[i].get(0, 0, f)
      out[idArr[i]] = Array(4) { j -> Point(f[j * 2].toDouble() - offset, f[j * 2 + 1].toDouble() - offset) }
      corners[i].release()
    }
    ids.release()
    return out
  }

  /** Returns (rectified BGR Mat, method, markers used). Caller releases the Mat. */
  fun rectify(img: Mat): Triple<Mat, String, Int> {
    val markers = detectMarkersPadded(img, pad = 60)
    val dst = Mat(CANVAS_H, CANVAS_W, img.type())
    val size = Size(CANVAS_W.toDouble(), CANVAS_H.toDouble())

    // 1. Exact 4-corner perspective rectification
    if (listOf(0, 1, 2, 3).all { it in markers }) {
      val src = MatOfPoint2f(markers[0]!![0], markers[1]!![1], markers[3]!![2], markers[2]!![3])
      val to = MatOfPoint2f(Point(60.0, 60.0), Point(2040.0, 60.0), Point(2040.0, 2910.0), Point(60.0, 2910.0))
      val m = Geometry.getPerspectiveTransform(src, to)
      Imgproc.warpPerspective(img, dst, m, size, Imgproc.INTER_LANCZOS4)
      src.release()
      to.release()
      m.release()
      return Triple(dst, "aruco-4-point", markers.size)
    }

    // 2. Multi-marker Homography or Similarity Transform (when corner markers are shadowed)
    val anchorSrc = ArrayList<Point>()
    val anchorDst = ArrayList<Point>()
    markers[0]?.let { anchorSrc.add(it[0]); anchorDst.add(Point(60.0, 60.0)) }
    markers[1]?.let { anchorSrc.add(it[1]); anchorDst.add(Point(2040.0, 60.0)) }
    markers[2]?.let { anchorSrc.add(it[3]); anchorDst.add(Point(60.0, 2910.0)) }
    markers[3]?.let { anchorSrc.add(it[2]); anchorDst.add(Point(2040.0, 2910.0)) }
    for (mid in markers.keys.sorted()) {
      val canon = CANONICAL_ANCHORS[mid] ?: continue
      val pts = markers[mid]!!
      anchorSrc.add(Point(pts.map { it.x }.average(), pts.map { it.y }.average()))
      anchorDst.add(canon)
    }

    if (anchorSrc.size >= 4) {
      val quads = HashSet<Int>()
      for (pt in anchorDst) {
        val q = (if (pt.x < 1050.0) 0 else 1) + (if (pt.y < 1485.0) 0 else 2)
        quads.add(q)
      }
      val missingBothTop = (0 !in markers && 1 !in markers)
      val missingBothBot = (2 !in markers && 3 !in markers)
      val unbalanced = quads.size < 3 || missingBothTop || missingBothBot

      if (unbalanced) {
        val aff = estimateSimilarityRansac(anchorSrc, anchorDst, 5.0)
        if (aff != null) {
          Imgproc.warpAffine(img, dst, aff, size, Imgproc.INTER_LANCZOS4, Core.BORDER_CONSTANT, Scalar(255.0, 255.0, 255.0))
          aff.release()
          return Triple(dst, "marker-similarity", anchorSrc.size)
        }
      } else {
        // Use full marker 4-corners when balanced for tighter RANSAC conditioning
        val fullSrc = ArrayList<Point>()
        val fullDst = ArrayList<Point>()
        var used = 0
        for ((id, pts) in markers) {
          val tpl = templateCorners(id) ?: continue
          fullSrc.addAll(pts)
          fullDst.addAll(tpl)
          used++
        }
        val mask = Mat()
        val sMat = MatOfPoint2f(*fullSrc.toTypedArray())
        val dMat = MatOfPoint2f(*fullDst.toTypedArray())
        val h = Geometry.findHomography(sMat, dMat, 8 /* RANSAC */, 5.0, mask)
        sMat.release()
        dMat.release()
        val inliers = if (h.empty()) 0 else Core.countNonZero(mask)
        mask.release()
        if (inliers >= 8) {
          Imgproc.warpPerspective(img, dst, h, size, Imgproc.INTER_LANCZOS4)
          h.release()
          return Triple(dst, "marker-homography", used)
        }
        h.release()
      }
    }

    // 3. Fallback: largest 4-point paper contour (> 40% frame area)
    val gray = Mat()
    Imgproc.cvtColor(img, gray, Imgproc.COLOR_BGR2GRAY)
    val blurred = Mat()
    Imgproc.GaussianBlur(gray, blurred, Size(5.0, 5.0), 0.0)
    val edged = Mat()
    Imgproc.Canny(blurred, edged, 50.0, 180.0)
    val contours = ArrayList<MatOfPoint>()
    val hierarchy = Mat()
    Imgproc.findContours(edged, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)
    hierarchy.release()
    gray.release()
    blurred.release()
    edged.release()

    for (c in contours.sortedByDescending { Geometry.contourArea(it) }.take(5)) {
      val c2f = MatOfPoint2f(*c.toArray())
      val approx = MatOfPoint2f()
      Geometry.approxPolyDP(c2f, approx, 0.02 * Geometry.arcLength(c2f, true), true)
      c2f.release()
      if (approx.total() == 4L && Geometry.contourArea(c) > img.rows() * img.cols() * 0.4) {
        val p = approx.toArray()
        approx.release()
        contours.forEach { it.release() }
        val tl = p.minByOrNull { it.x + it.y }!!
        val br = p.maxByOrNull { it.x + it.y }!!
        val tr = p.minByOrNull { it.y - it.x }!!
        val bl = p.maxByOrNull { it.y - it.x }!!
        val src = MatOfPoint2f(tl, tr, br, bl)
        val to = MatOfPoint2f(
          Point(0.0, 0.0),
          Point(CANVAS_W.toDouble(), 0.0),
          Point(CANVAS_W.toDouble(), CANVAS_H.toDouble()),
          Point(0.0, CANVAS_H.toDouble()),
        )
        val m = Geometry.getPerspectiveTransform(src, to)
        Imgproc.warpPerspective(img, dst, m, size)
        src.release()
        to.release()
        m.release()
        return Triple(dst, "contour-fallback", markers.keys.count { it in 0..3 })
      }
      approx.release()
    }
    contours.forEach { it.release() }
    Imgproc.resize(img, dst, size)
    return Triple(dst, "direct-scaling", markers.keys.count { it in 0..3 })
  }

  /**
   * Exact 4-DOF 2D similarity transform (`[a -b tx; b a ty]`) with RANSAC + least-squares refinement,
   * matching `cv2.estimateAffinePartial2D(..., method=cv2.RANSAC, ransacReprojThreshold=5.0)`.
   */
  private fun estimateSimilarityRansac(src: List<Point>, dst: List<Point>, thresh: Double): Mat? {
    val n = src.size
    if (n < 2) return null
    var bestInliers = IntArray(0)

    fun solvePair(i: Int, j: Int): DoubleArray? {
      val dxS = src[j].x - src[i].x
      val dyS = src[j].y - src[i].y
      val denom = dxS * dxS + dyS * dyS
      if (denom < 1e-6) return null
      val dxD = dst[j].x - dst[i].x
      val dyD = dst[j].y - dst[i].y
      val a = (dxS * dxD + dyS * dyD) / denom
      val b = (dxS * dyD - dyS * dxD) / denom
      val tx = dst[i].x - (a * src[i].x - b * src[i].y)
      val ty = dst[i].y - (b * src[i].x + a * src[i].y)
      return doubleArrayOf(a, b, tx, ty)
    }

    for (i in 0 until n) {
      for (j in i + 1 until n) {
        val p = solvePair(i, j) ?: continue
        val inliers = (0 until n).filter { k ->
          val px = p[0] * src[k].x - p[1] * src[k].y + p[2]
          val py = p[1] * src[k].x + p[0] * src[k].y + p[3]
          hypot(px - dst[k].x, py - dst[k].y) <= thresh
        }.toIntArray()
        if (inliers.size > bestInliers.size) bestInliers = inliers
      }
    }
    if (bestInliers.size < 2) return null

    // Least-squares Umeyama/Procrustes refinement over all inliers
    var mxS = 0.0; var myS = 0.0; var mxD = 0.0; var myD = 0.0
    for (k in bestInliers) {
      mxS += src[k].x; myS += src[k].y
      mxD += dst[k].x; myD += dst[k].y
    }
    val m = bestInliers.size.toDouble()
    mxS /= m; myS /= m; mxD /= m; myD /= m
    var sxx = 0.0; var numA = 0.0; var numB = 0.0
    for (k in bestInliers) {
      val xs = src[k].x - mxS; val ys = src[k].y - myS
      val xd = dst[k].x - mxD; val yd = dst[k].y - myD
      sxx += xs * xs + ys * ys
      numA += xs * xd + ys * yd
      numB += xs * yd - ys * xd
    }
    if (sxx < 1e-6) return null
    val a = numA / sxx
    val b = numB / sxx
    val tx = mxD - (a * mxS - b * myS)
    val ty = myD - (b * mxS + a * myS)

    return Mat(2, 3, CvType.CV_64FC1).apply {
      put(0, 0, a, -b, tx, b, a, ty)
    }
  }

  /** Stage 2 (`extract_cells`): CLAHE + MORPH_CLOSE + long-kernel snapping for 15 name cells and 8..12 question cells. */
  fun locate(rect: Mat, gray: Mat): Pair<List<Box>, List<Row>> {
    val markerMap = detectMarkersPadded(rect, pad = 40)

    val clahe = Imgproc.createCLAHE(2.5, Size(8.0, 8.0))
    val enhanced = Mat()
    clahe.apply(gray, enhanced)
    val thresh = Mat()
    Imgproc.adaptiveThreshold(enhanced, thresh, 255.0, Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C, Imgproc.THRESH_BINARY_INV, 31, 8.0)
    enhanced.release()

    val kCloseH = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(9.0, 1.0))
    val kCloseV = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(1.0, 9.0))
    val hClosed = Mat(); val vClosed = Mat()
    Imgproc.morphologyEx(thresh, hClosed, Imgproc.MORPH_CLOSE, kCloseH)
    Imgproc.morphologyEx(thresh, vClosed, Imgproc.MORPH_CLOSE, kCloseV)
    thresh.release(); kCloseH.release(); kCloseV.release()

    val kLongH = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(180.0, 1.0))
    val kLongV = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(1.0, 50.0))
    val hLines = Mat(); val vLines = Mat()
    Imgproc.morphologyEx(hClosed, hLines, Imgproc.MORPH_OPEN, kLongH)
    Imgproc.morphologyEx(vClosed, vLines, Imgproc.MORPH_OPEN, kLongV)
    hClosed.release(); vClosed.release(); kLongH.release(); kLongV.release()

    // 1. Student Name row active snapping (15 cells)
    val nameHProf = rowSums(hLines, 200, 360, 450, 1800)
    val nameMax = nameHProf.maxOrNull() ?: 0
    val namePeaks = ArrayList<Int>()
    if (nameMax > 0) {
      for (dy in 2 until nameHProf.size - 2) {
        val v = nameHProf[dy]
        if (v > 0.15 * nameMax && v >= nameHProf[dy - 2] && v >= nameHProf[dy - 1] && v >= nameHProf[dy + 1] && v >= nameHProf[dy + 2]) {
          namePeaks.add(200 + dy)
        }
      }
    }
    var nameTopY = 214
    var nameBotY = 306
    outer@ for (i in namePeaks.indices) {
      for (j in i + 1 until namePeaks.size) {
        val dist = namePeaks[j] - namePeaks[i]
        if (dist in 75..110) {
          nameTopY = namePeaks[i]
          nameBotY = namePeaks[j]
          break@outer
        }
      }
    }
    val nameCellH = nameBotY - nameTopY

    val nameVProf = colSums(vLines, nameTopY + 10, nameBotY - 10, 420, 1850)
    val nameVMax = nameVProf.maxOrNull() ?: 0
    val rawNameV = ArrayList<Int>()
    if (nameVMax > 0) {
      for (dx in 2 until nameVProf.size - 2) {
        val v = nameVProf[dx]
        if (v > 0.15 * nameVMax && v >= nameVProf[dx - 2] && v >= nameVProf[dx - 1] && v >= nameVProf[dx + 1] && v >= nameVProf[dx + 2]) {
          rawNameV.add(420 + dx)
        }
      }
    }
    val clusteredNameV = clusterPeaks(rawNameV, 10)
    val bestNameChain = findLongestChain(clusteredNameV, 75.0, 98.0, 12.0)
    val (nameStartX, namePitch) = if (bestNameChain.size >= 2) {
      Pair(bestNameChain.first(), (bestNameChain.last() - bestNameChain.first()) / (bestNameChain.size - 1).toDouble())
    } else {
      Pair(465, 88.0)
    }
    val nameBoxes = (0 until 15).map { idx ->
      Box((nameStartX + idx * namePitch).roundToInt(), nameTopY, namePitch.roundToInt(), nameCellH)
    }

    // 2. Question rows active snapping (`1..maxQ`)
    val detectedQs = markerMap.keys.filter { it >= 11 }.map { it - 10 }
    val maxQ = (detectedQs.maxOrNull() ?: 4).coerceIn(4, 8)
    val rows = ArrayList<Row>()

    for (qNum in 1..maxQ) {
      val mid = qNum + 10
      val estMy = markerMap[mid]?.map { it.y }?.average() ?: (495.0 + (qNum - 1) * 280.0)
      val ySearchMin = max(0, (estMy - 35.0).toInt())
      val ySearchMax = min(gray.rows(), (estMy + 140.0).toInt())
      val rowHProf = rowSums(hLines, ySearchMin, ySearchMax, 220, 1020)
      val rowHMax = rowHProf.maxOrNull() ?: 0

      val peaks = ArrayList<Pair<Int, Int>>()
      if (rowHMax > 0) {
        for (dy in 2 until rowHProf.size - 2) {
          val v = rowHProf[dy]
          if (v > 0.20 * rowHMax && v >= rowHProf[dy - 2] && v >= rowHProf[dy - 1] && v >= rowHProf[dy + 1] && v >= rowHProf[dy + 2]) {
            peaks.add(Pair(dy, v))
          }
        }
      }
      peaks.sortByDescending { it.second }

      var rowTop = (estMy - 5.0).roundToInt().coerceIn(0, gray.rows() - 20)
      var rowH = 100
      var snappedH = false
      for (i in peaks.indices) {
        for (j in i + 1 until peaks.size) {
          val dist = abs(peaks[i].first - peaks[j].first)
          if (dist in 85..115) {
            rowTop = ySearchMin + min(peaks[i].first, peaks[j].first)
            rowH = dist
            snappedH = true
            break
          }
        }
        if (snappedH) break
      }

      val vProf = colSums(vLines, rowTop + 10, rowTop + rowH - 10, 160, 1500)
      val vMax = vProf.maxOrNull() ?: 0
      val rawVPks = ArrayList<Int>()
      if (vMax > 0) {
        for (dx in 2 until vProf.size - 2) {
          val v = vProf[dx]
          if (v > 0.20 * vMax && v >= vProf[dx - 2] && v >= vProf[dx - 1] && v >= vProf[dx + 1] && v >= vProf[dx + 2]) {
            rawVPks.add(160 + dx)
          }
        }
      }
      val clusteredV = clusterPeaks(rawVPks, 10).filter { it >= 185 }
      val bestChain = findLongestChain(clusteredV, 85.0, 115.0, 15.0)

      val (startX, pitch, cellCount) = if (bestChain.size >= 2) {
        val sx = bestChain.first()
        val count = (bestChain.size - 1).coerceIn(8, 12)
        val p = if (bestChain.size > count) {
          (bestChain[count] - sx) / count.toDouble()
        } else {
          (bestChain.last() - sx) / (bestChain.size - 1).toDouble()
        }
        Triple(sx, p, count)
      } else {
        Triple(224, 100.0, 8)
      }

      val boxes = (0 until cellCount).map { c ->
        Box((startX + c * pitch).roundToInt(), rowTop, pitch.roundToInt(), rowH)
      }
      rows.add(Row(mid, boxes))
    }

    hLines.release()
    vLines.release()
    return Pair(nameBoxes, rows)
  }

  /**
   * Stage 3 (`suppress_grid_borders`): erases long printed grid lines strictly in the outer 16%
   * perimeter zone while protecting the inner 84% safe core of every cell. Caller releases returned Mat.
   */
  fun suppressGridBorders(gray: Mat, nameBoxes: List<Box>, rows: List<Row>, safeMarginPct: Int = 8): Mat {
    val ih = gray.rows()
    val iw = gray.cols()
    val thresh = Mat()
    Imgproc.adaptiveThreshold(gray, thresh, 255.0, Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C, Imgproc.THRESH_BINARY_INV, 21, 10.0)

    val perimeterMask = Mat.zeros(ih, iw, CvType.CV_8UC1)
    val allBoxes = ArrayList<Box>(nameBoxes.size + rows.sumOf { it.boxes.size })
    allBoxes.addAll(nameBoxes)
    rows.forEach { allBoxes.addAll(it.boxes) }

    // Draw outer envelopes first, then carve out protected inner cores so adjacent cell overlaps stay safe
    for (b in allBoxes) {
      val x1Out = max(0, b.x - 2).toDouble()
      val y1Out = max(0, b.y - 2).toDouble()
      val x2Out = min(iw - 1, b.x + b.w + 2).toDouble()
      val y2Out = min(ih - 1, b.y + b.h + 2).toDouble()
      Imgproc.rectangle(perimeterMask, Point(x1Out, y1Out), Point(x2Out, y2Out), Scalar(255.0), -1)
    }
    for (b in allBoxes) {
      val my = max(6, (b.h * (safeMarginPct / 100.0)).roundToInt())
      val mx = max(6, (b.w * (safeMarginPct / 100.0)).roundToInt())
      val x1In = b.x + mx
      val y1In = b.y + my
      val x2In = b.x + b.w - mx
      val y2In = b.y + b.h - my
      if (x2In > x1In && y2In > y1In) {
        Imgproc.rectangle(perimeterMask, Point(x1In.toDouble(), y1In.toDouble()), Point(x2In.toDouble(), y2In.toDouble()), Scalar(0.0), -1)
      }
    }

    val hKernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(80.0, 1.0))
    val vKernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(1.0, 75.0))
    val hLines = Mat(); val vLines = Mat()
    Imgproc.morphologyEx(thresh, hLines, Imgproc.MORPH_OPEN, hKernel)
    Imgproc.morphologyEx(thresh, vLines, Imgproc.MORPH_OPEN, vKernel)
    thresh.release(); hKernel.release(); vKernel.release()

    val detected = Mat()
    Core.bitwise_or(hLines, vLines, detected)
    hLines.release(); vLines.release()

    val safeBorder = Mat()
    Core.bitwise_and(detected, perimeterMask, safeBorder)
    detected.release()

    val dKernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(3.0, 3.0))
    val dilated = Mat()
    Imgproc.dilate(safeBorder, dilated, dKernel)
    safeBorder.release(); dKernel.release()

    val finalMask = Mat()
    Core.bitwise_and(dilated, perimeterMask, finalMask)
    dilated.release(); perimeterMask.release()

    val suppressed = gray.clone()
    suppressed.setTo(Scalar(255.0), finalMask)
    finalMask.release()
    return suppressed
  }

  private fun rowSums(mat: Mat, y0: Int, y1: Int, x0: Int, x1: Int): IntArray {
    val ya = max(0, y0); val yb = min(mat.rows(), y1)
    val xa = max(0, x0); val xb = min(mat.cols(), x1)
    if (yb <= ya || xb <= xa) return IntArray(0)
    val sub = mat.submat(ya, yb, xa, xb)
    val red = Mat()
    Core.reduce(sub, red, 1, Core.REDUCE_SUM, CvType.CV_32S)
    sub.release()
    val out = IntArray(yb - ya)
    red.get(0, 0, out)
    red.release()
    return out
  }

  private fun colSums(mat: Mat, y0: Int, y1: Int, x0: Int, x1: Int): IntArray {
    val ya = max(0, y0); val yb = min(mat.rows(), y1)
    val xa = max(0, x0); val xb = min(mat.cols(), x1)
    if (yb <= ya || xb <= xa) return IntArray(0)
    val sub = mat.submat(ya, yb, xa, xb)
    val red = Mat()
    Core.reduce(sub, red, 0, Core.REDUCE_SUM, CvType.CV_32S)
    sub.release()
    val out = IntArray(xb - xa)
    red.get(0, 0, out)
    red.release()
    return out
  }

  private fun clusterPeaks(peaks: List<Int>, minGap: Int): List<Int> {
    val out = ArrayList<Int>()
    for (p in peaks) {
      if (out.isEmpty() || (p - out.last()) > minGap) {
        out.add(p)
      } else {
        out[out.lastIndex] = ((out.last() + p) / 2.0).roundToInt()
      }
    }
    return out
  }

  private fun findLongestChain(clustered: List<Int>, minPitch: Double, maxPitch: Double, tol: Double): List<Int> {
    var best = emptyList<Int>()
    for (i in clustered.indices) {
      for (j in i + 1 until clustered.size) {
        var pitchCand = (clustered[j] - clustered[i]).toDouble()
        if (pitchCand in minPitch..maxPitch) {
          val chain = ArrayList<Int>()
          chain.add(clustered[i])
          chain.add(clustered[j])
          var expectedNext = clustered[j] + pitchCand
          for (k in j + 1 until clustered.size) {
            if (abs(clustered[k] - expectedNext) <= tol) {
              chain.add(clustered[k])
              pitchCand = (clustered[k] - chain.first()) / (chain.size - 1).toDouble()
              expectedNext = clustered[k] + pitchCand
            }
          }
          if (chain.size > best.size) best = chain
        }
      }
    }
    return best
  }

  fun cropGray(gray: Mat, b: Box): Mat {
    val x = min(max(0, b.x), gray.cols() - 1)
    val y = min(max(0, b.y), gray.rows() - 1)
    val w = max(1, min(b.w, gray.cols() - x))
    val h = max(1, min(b.h, gray.rows() - y))
    return gray.submat(y, y + h, x, x + w)
  }

  fun qrWithOpenCv(rect: Mat): String {
    // Exact PDF geometry (`pdf_blank.py`): QR sits at (23..41 mm, 6..24 mm) -> [x: 262..455, y: 80..273] in rectified px.
    val roi = rect.submat(45, min(310, rect.rows()), 235, min(495, rect.cols()))
    val gray = if (roi.channels() == 1) roi.clone() else Mat().also { Imgproc.cvtColor(roi, it, Imgproc.COLOR_BGR2GRAY) }
    roi.release()
    val padded = Mat()
    Core.copyMakeBorder(gray, padded, 24, 24, 24, 24, Core.BORDER_CONSTANT, Scalar(255.0))
    gray.release()
    try {
      val direct = qrCv.detectAndDecode(padded)
      if (direct.isNotEmpty()) return direct

      // Pass 2: Otsu binarized at full rectified scale
      val bin = Mat()
      Imgproc.threshold(padded, bin, 0.0, 255.0, Imgproc.THRESH_BINARY or Imgproc.THRESH_OTSU)
      val d2 = qrCv.detectAndDecode(bin)
      bin.release()
      if (d2.isNotEmpty()) return d2

      // Pass 3: 0.5x downscale + Otsu sharpens upsampled low-res photos (e.g. 768x1024 messaging images)
      val small = Mat()
      Imgproc.resize(padded, small, Size(), 0.5, 0.5, Imgproc.INTER_AREA)
      val smallBin = Mat()
      Imgproc.threshold(small, smallBin, 0.0, 255.0, Imgproc.THRESH_BINARY or Imgproc.THRESH_OTSU)
      small.release()
      val d3 = qrCv.detectAndDecode(smallBin)
      smallBin.release()
      return d3
    } finally {
      padded.release()
    }
  }

  fun qrWithMlKit(rect: Mat): String? {
    if (android.os.Looper.myLooper() == android.os.Looper.getMainLooper()) return null
    val roi = rect.submat(45, min(310, rect.rows()), 235, min(495, rect.cols()))
    val padded = Mat()
    Core.copyMakeBorder(roi, padded, 24, 24, 24, 24, Core.BORDER_CONSTANT, Scalar(255.0, 255.0, 255.0))
    roi.release()
    val bmp = Bitmap.createBitmap(padded.cols(), padded.rows(), Bitmap.Config.ARGB_8888)
    Utils.matToBitmap(padded, bmp)
    padded.release()
    return try {
      val result = Tasks.await(
        mlKit.process(InputImage.fromBitmap(bmp, 0)),
        450,
        java.util.concurrent.TimeUnit.MILLISECONDS,
      )
      result.firstOrNull()?.rawValue
    } finally {
      bmp.recycle()
    }
  }
}
