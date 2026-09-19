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
import org.opencv.core.Rect
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.geometry.Geometry
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.ArucoDetector
import org.opencv.objdetect.DetectorParameters
import org.opencv.objdetect.Objdetect
import org.opencv.objdetect.QRCodeDetector
import kotlin.math.max
import kotlin.math.min

/**
 * Sheet geometry ported from the authors' `BlankOCRScanner` (blank_pipeline.py, commit 796601e):
 * `rectify_sheet` and `extract_cells`. Frames/crops never leave native memory; only text and numbers
 * are returned. Template constants are the server's (see docs/contracts/ocr-server-pipeline-reference.md).
 */
class SheetPipeline {
  companion object {
    const val CANVAS_W = 2100
    const val CANVAS_H = 2970
  }

  data class Box(val x: Int, val y: Int, val w: Int, val h: Int)
  data class Row(val markerId: Int, val boxes: List<Box>)
  class Located(val method: String, val markersUsed: Int, val name: List<Box>, val rows: List<Row>)

  private val detector = ArucoDetector(
    Objdetect.getPredefinedDictionary(Objdetect.DICT_4X4_50),
    DetectorParameters(),
  )
  private val qrCv = QRCodeDetector()
  private val mlKit = BarcodeScanning.getClient(
    BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build(),
  )

  /** Template corners (canvas px, order TL, TR, BR, BL) of markers with a known position; mm x 10. */
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

  fun markerCorners(img: Mat): Map<Int, Array<Point>> {
    val corners = ArrayList<Mat>()
    val ids = Mat()
    detector.detectMarkers(img, corners, ids)
    val out = HashMap<Int, Array<Point>>()
    if (ids.empty()) { corners.forEach { it.release() }; ids.release(); return out }
    val idArr = IntArray(ids.total().toInt())
    ids.get(0, 0, idArr)
    for (i in corners.indices) {
      val f = FloatArray(8)
      corners[i].get(0, 0, f)
      out[idArr[i]] = Array(4) { j -> Point(f[j * 2].toDouble(), f[j * 2 + 1].toDouble()) }
      corners[i].release()
    }
    ids.release()
    return out
  }

  /** Returns (rectified BGR Mat, method, markers used). Caller releases the Mat. */
  fun rectify(img: Mat): Triple<Mat, String, Int> {
    val markers = markerCorners(img)
    val dst = Mat(CANVAS_H, CANVAS_W, img.type())
    val size = Size(CANVAS_W.toDouble(), CANVAS_H.toDouble())
    if (listOf(0, 1, 2, 3).all { it in markers }) {
      val src = MatOfPoint2f(markers[0]!![0], markers[1]!![1], markers[3]!![2], markers[2]!![3])
      val to = MatOfPoint2f(Point(60.0, 60.0), Point(2040.0, 60.0), Point(2040.0, 2910.0), Point(60.0, 2910.0))
      val m = Geometry.getPerspectiveTransform(src, to)
      Imgproc.warpPerspective(img, dst, m, size, Imgproc.INTER_LANCZOS4)
      src.release(); to.release(); m.release()
      return Triple(dst, "aruco-4-point", 4)
    }

    // Fallback A (ours, not in the authors' code): fit a homography from every detected marker whose
    // template position is known (corner markers 0-3 and question markers 11-18), so one hidden or
    // damaged corner marker no longer breaks the scan.
    val srcPts = ArrayList<Point>(); val dstPts = ArrayList<Point>()
    var used = 0
    for ((id, pts) in markers) {
      val tpl = templateCorners(id) ?: continue
      srcPts.addAll(pts); dstPts.addAll(tpl); used++
    }
    if (used >= 3 && srcPts.size >= 12) {
      val mask = Mat()
      val h = Geometry.findHomography(MatOfPoint2f(*srcPts.toTypedArray()), MatOfPoint2f(*dstPts.toTypedArray()), 8 /* RANSAC */, 3.0, mask)
      val inliers = if (h.empty()) 0 else Core.countNonZero(mask)
      mask.release()
      if (inliers >= 12) {
        Imgproc.warpPerspective(img, dst, h, size, Imgproc.INTER_LANCZOS4)
        h.release()
        return Triple(dst, "marker-homography", used)
      }
      h.release()
    }

    // Fallback B (authors'): largest 4-point contour covering > 40% of the frame.
    val gray = Mat(); Imgproc.cvtColor(img, gray, Imgproc.COLOR_BGR2GRAY)
    val blurred = Mat(); Imgproc.GaussianBlur(gray, blurred, Size(5.0, 5.0), 0.0)
    val edged = Mat(); Imgproc.Canny(blurred, edged, 50.0, 180.0)
    val contours = ArrayList<MatOfPoint>()
    Imgproc.findContours(edged, contours, Mat(), Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)
    gray.release(); blurred.release(); edged.release()
    for (c in contours.sortedByDescending { Geometry.contourArea(it) }.take(5)) {
      val c2f = MatOfPoint2f(*c.toArray())
      val approx = MatOfPoint2f()
      Geometry.approxPolyDP(c2f, approx, 0.02 * Geometry.arcLength(c2f, true), true)
      if (approx.total() == 4L && Geometry.contourArea(c) > img.rows() * img.cols() * 0.4) {
        val p = approx.toArray()
        val tl = p.minByOrNull { it.x + it.y }!!; val br = p.maxByOrNull { it.x + it.y }!!
        val tr = p.minByOrNull { it.y - it.x }!!; val bl = p.maxByOrNull { it.y - it.x }!!
        val src = MatOfPoint2f(tl, tr, br, bl)
        val to = MatOfPoint2f(Point(0.0, 0.0), Point(CANVAS_W.toDouble(), 0.0), Point(CANVAS_W.toDouble(), CANVAS_H.toDouble()), Point(0.0, CANVAS_H.toDouble()))
        val m = Geometry.getPerspectiveTransform(src, to)
        Imgproc.warpPerspective(img, dst, m, size)
        return Triple(dst, "contour-fallback", markers.keys.count { it in 0..3 })
      }
    }
    Imgproc.resize(img, dst, size)
    return Triple(dst, "direct-scaling", markers.keys.count { it in 0..3 })
  }

  private fun rowMeanArgmax(sobel: Mat, y0: Int, y1: Int, x0: Int, x1: Int): Int {
    val r = Rect(x0, max(0, y0), x1 - x0, min(sobel.rows(), y1) - max(0, y0))
    val col = Mat()
    Core.reduce(sobel.submat(r), col, 1, Core.REDUCE_AVG, CvType.CV_32F)
    val mm = Core.minMaxLoc(col)
    col.release()
    return max(0, y0) + mm.maxLoc.y.toInt()
  }

  fun locate(rect: Mat, gray: Mat): Pair<List<Box>, List<Row>> {
    val thresh = Mat()
    Imgproc.adaptiveThreshold(gray, thresh, 255.0, Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C, Imgproc.THRESH_BINARY_INV, 25, 10.0)
    val vKernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(1.0, 35.0))
    val vLines = Mat(); Imgproc.morphologyEx(thresh, vLines, Imgproc.MORPH_OPEN, vKernel)
    thresh.release(); vKernel.release()
    val sob = Mat(); Imgproc.Sobel(gray, sob, CvType.CV_32F, 0, 1, 3)
    val sobel = Mat(); Core.absdiff(sob, Scalar(0.0), sobel); sob.release()

    val nameTop = rowMeanArgmax(sobel, 200, 245, 470, 1910)
    val name = (0 until 16).map { Box((474 + it * 89.9).toInt(), nameTop, 90, 96) }

    val markers = markerCorners(rect).filterKeys { it >= 11 }
    val rows = ArrayList<Row>()
    for (id in markers.keys.sorted()) {
      val my = markers[id]!!.map { it.y }.average()
      val yMin = (my - 40).toInt()
      val snapped = rowMeanArgmax(sobel, yMin, (my + 40).toInt(), 220, 1020)
      var count = 0
      for (c in 1..12) {
        val xd = 220 + c * 100
        val y0 = snapped + 15; val y1 = min(vLines.rows(), snapped + 80)
        val x0 = xd - 10; val x1 = min(vLines.cols(), xd + 10)
        if (y1 <= y0 || x1 <= x0) break
        val strip = vLines.submat(y0, y1, x0, x1)
        val nz = Core.countNonZero(strip)
        if (nz > 100) count = c else break
      }
      count = max(1, min(if (count > 0) count else 8, 12))
      rows.add(Row(id, (0 until count).map { Box(220 + it * 100, snapped, 100, 95) }))
    }
    vLines.release(); sobel.release()
    return Pair(name, rows)
  }

  fun cropGray(gray: Mat, b: Box): Mat {
    val x = min(max(0, b.x), gray.cols() - 1); val y = min(max(0, b.y), gray.rows() - 1)
    val w = min(b.w, gray.cols() - x); val h = min(b.h, gray.rows() - y)
    return gray.submat(y, y + h, x, x + w)
  }

  /** QR read with OpenCV's detector on the rectified header area (QR sits at 23 mm, 6 mm, 18 mm). */
  fun qrWithOpenCv(rect: Mat): String {
    val roi = rect.submat(30, 260, 200, 440)
    return qrCv.detectAndDecode(roi)
  }

  /** QR read with bundled ML Kit (offline) on the same area. */
  fun qrWithMlKit(rect: Mat): String? {
    val roi = rect.submat(30, 260, 200, 440)
    val bmp = Bitmap.createBitmap(roi.cols(), roi.rows(), Bitmap.Config.ARGB_8888)
    Utils.matToBitmap(roi, bmp)
    val result = Tasks.await(mlKit.process(InputImage.fromBitmap(bmp, 0)))
    bmp.recycle()
    return result.firstOrNull()?.rawValue
  }
}
