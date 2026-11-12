package expo.modules.ocrnative

import android.graphics.Bitmap
import android.os.Looper
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import org.opencv.android.Utils
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.QRCodeDetector
import java.util.concurrent.TimeUnit
import kotlin.math.min

/**
 * Multi-pass native-memory QR decoder for rectified 2100x2970 sheets (with unwarped fallback).
 * Converts BGR -> RGBA properly before `Utils.matToBitmap` and frees all intermediate Mats/Bitmaps immediately (ADR 0003).
 */
object QrDecoder {
  private val qrCv by lazy { QRCodeDetector() }
  private val mlKit by lazy {
    BarcodeScanning.getClient(
      BarcodeScannerOptions.Builder()
        .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
        .build(),
    )
  }

  fun decode(rectifiedBgr: Mat, originalBgr: Mat? = null): String {
    if (!rectifiedBgr.empty()) {
      // Pass 1: Canonical QR zone [x: 220..510, y: 40..320] via OpenCV
      val tight = tryOpenCvRegion(rectifiedBgr, 220, 40, 510, 320)
      if (tight.isNotEmpty()) return tight

      // Pass 2: Wider header zone [x: 160..620, y: 15..380] (covers similarity/contour warp shifts)
      val wide = tryOpenCvRegion(rectifiedBgr, 160, 15, 620, 380)
      if (wide.isNotEmpty()) return wide

      // Pass 3: ML Kit QR barcode scanner on wider header zone (BGR -> RGBA fixed)
      val mlRect = tryMlKitRegion(rectifiedBgr, 160, 15, 620, 380)
      if (!mlRect.isNullOrEmpty()) return mlRect
    }

    // Pass 4: Fallback to top half of original upright photo if perspective shear degraded rectified QR
    if (originalBgr != null && !originalBgr.empty()) {
      val mlOrig = tryMlKitRegion(originalBgr, 0, 0, originalBgr.cols(), (originalBgr.rows() * 0.45).toInt())
      if (!mlOrig.isNullOrEmpty()) return mlOrig
    }

    return ""
  }

  private fun tryOpenCvRegion(srcBgr: Mat, x0: Int, y0: Int, x1: Int, y1: Int): String {
    val xa = x0.coerceIn(0, srcBgr.cols() - 1)
    val ya = y0.coerceIn(0, srcBgr.rows() - 1)
    val xb = min(x1, srcBgr.cols())
    val yb = min(y1, srcBgr.rows())
    if (xb - xa < 32 || yb - ya < 32) return ""

    val roi = srcBgr.submat(ya, yb, xa, xb)
    val gray = if (roi.channels() == 1) roi.clone() else Mat().also { Imgproc.cvtColor(roi, it, Imgproc.COLOR_BGR2GRAY) }
    roi.release()
    val padded = Mat()
    Core.copyMakeBorder(gray, padded, 24, 24, 24, 24, Core.BORDER_CONSTANT, Scalar(255.0))
    gray.release()

    try {
      val direct = qrCv.detectAndDecode(padded)
      if (direct.isNotEmpty()) return direct

      val otsu = Mat()
      Imgproc.threshold(padded, otsu, 0.0, 255.0, Imgproc.THRESH_BINARY or Imgproc.THRESH_OTSU)
      val dOtsu = qrCv.detectAndDecode(otsu)
      otsu.release()
      if (dOtsu.isNotEmpty()) return dOtsu

      val adapt = Mat()
      Imgproc.adaptiveThreshold(padded, adapt, 255.0, Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C, Imgproc.THRESH_BINARY, 31, 7.0)
      val dAdapt = qrCv.detectAndDecode(adapt)
      adapt.release()
      if (dAdapt.isNotEmpty()) return dAdapt

      val small = Mat()
      Imgproc.resize(padded, small, Size(), 0.5, 0.5, Imgproc.INTER_AREA)
      val smallBin = Mat()
      Imgproc.threshold(small, smallBin, 0.0, 255.0, Imgproc.THRESH_BINARY or Imgproc.THRESH_OTSU)
      small.release()
      val dSmall = qrCv.detectAndDecode(smallBin)
      smallBin.release()
      return dSmall
    } catch (_: Throwable) {
      return ""
    } finally {
      padded.release()
    }
  }

  private fun tryMlKitRegion(srcBgr: Mat, x0: Int, y0: Int, x1: Int, y1: Int): String? {
    if (Looper.myLooper() == Looper.getMainLooper()) return null
    val xa = x0.coerceIn(0, srcBgr.cols() - 1)
    val ya = y0.coerceIn(0, srcBgr.rows() - 1)
    val xb = min(x1, srcBgr.cols())
    val yb = min(y1, srcBgr.rows())
    if (xb - xa < 32 || yb - ya < 32) return null

    val roi = srcBgr.submat(ya, yb, xa, xb)
    val padded = Mat()
    Core.copyMakeBorder(roi, padded, 24, 24, 24, 24, Core.BORDER_CONSTANT, Scalar(255.0, 255.0, 255.0))
    roi.release()

    val rgba = Mat()
    if (padded.channels() == 1) {
      Imgproc.cvtColor(padded, rgba, Imgproc.COLOR_GRAY2RGBA)
    } else {
      Imgproc.cvtColor(padded, rgba, Imgproc.COLOR_BGR2RGBA)
    }
    padded.release()

    val bmp = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
    Utils.matToBitmap(rgba, bmp)
    rgba.release()

    return try {
      val barcodes = Tasks.await(
        mlKit.process(InputImage.fromBitmap(bmp, 0)),
        1800,
        TimeUnit.MILLISECONDS,
      )
      barcodes.firstOrNull { !it.rawValue.isNullOrEmpty() }?.rawValue
    } catch (_: Throwable) {
      null
    } finally {
      bmp.recycle()
    }
  }
}
