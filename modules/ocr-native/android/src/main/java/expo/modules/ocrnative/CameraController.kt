package expo.modules.ocrnative

import android.content.Context
import android.graphics.ImageFormat
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import androidx.lifecycle.LifecycleOwner
import org.json.JSONObject
import org.opencv.android.OpenCVLoader
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfDouble
import org.opencv.core.Point
import org.opencv.core.Rect
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import java.io.ByteArrayInputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.hypot

/**
 * Camera + alignment + capture, all inside native memory (ADR 0003).
 *
 * Uses canonical C++20 `tatar_ocr::NativeBlankScanner` (`third_party/tatar_ocr/native`):
 * - Viewfinder uses `scanner->detect_markers_padded(preview, 0)` (with non-blocking fallback while warming up)
 * - `capture()` supports both `ImageFormat.JPEG` and `ImageFormat.YUV_420_888` + portrait EXIF / `rotationDegrees`
 * - `readEncoded()` normalizes all 8 EXIF orientations deterministically in native memory before `process_blank`.
 */
object CameraController {
  private val analysisExecutor = Executors.newSingleThreadExecutor()
  private val captureExecutor = Executors.newSingleThreadExecutor()
  private val fallbackPreviewPipeline by lazy { SheetPipeline() }

  @Volatile private var imageCapture: ImageCapture? = null
  @Volatile private var emit: ((Map<String, Any?>) -> Unit)? = null
  private var provider: ProcessCameraProvider? = null
  private var lastAnalysisNs = 0L
  private var prevCorners: List<Pair<Double, Double>>? = null
  private var stableFrames = 0
  private var yFrameBytes = ByteArray(0)

  @Volatile private var reader: SheetReader? = null
  @Volatile var capturing = false
  @Volatile private var opencvReady = false

  @Synchronized
  private fun ensureOpenCv() {
    if (!opencvReady) opencvReady = OpenCVLoader.initLocal()
    check(opencvReady) { "OPENCV_LOAD_FAILED" }
  }

  fun start(context: Context, owner: LifecycleOwner, previewView: PreviewView, onAlignment: (Map<String, Any?>) -> Unit) {
    ensureOpenCv()
    stopRequested = false
    emit = onAlignment
    val appCtx = context.applicationContext ?: context
    // Pre-initialize C++20 NativeBlankScanner off the UI/analyzer threads while teacher aims camera
    captureExecutor.execute {
      try {
        getReader(appCtx)
      } catch (e: Throwable) {
        android.util.Log.w("OcrCamera", "NativeBlankScanner pre-warm deferred: $e")
      }
    }

    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      val p = future.get()
      provider = p
      val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
      val analysis = ImageAnalysis.Builder()
        .setResolutionSelector(
          ResolutionSelector.Builder()
            .setResolutionStrategy(ResolutionStrategy(Size(1280, 960), ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER))
            .build(),
        )
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .build()
      analysis.setAnalyzer(analysisExecutor) { image ->
        try {
          analyze(image)
        } catch (e: Throwable) {
          android.util.Log.w("OcrCamera", "analysis skipped: $e")
        } finally {
          image.close()
        }
      }
      val capture = ImageCapture.Builder()
        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
        .setResolutionSelector(
          ResolutionSelector.Builder()
            .setResolutionStrategy(ResolutionStrategy(Size(4000, 3000), ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER))
            .build(),
        )
        .build()
      p.unbindAll()
      p.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis, capture)
      imageCapture = capture
    }, ContextCompat.getMainExecutor(context))
  }

  @Volatile private var stopRequested = false

  fun stop() {
    if (capturing) {
      stopRequested = true
      return
    }
    unbind()
  }

  private fun unbind() {
    stopRequested = false
    provider?.unbindAll()
    provider = null
    imageCapture = null
    emit = null
    prevCorners = null
    stableFrames = 0
  }

  private fun detectPreviewMarkers(gray: Mat): Map<Int, Array<Point>>? {
    val activeReader = reader
    if (activeReader != null) {
      val json = JSONObject(activeReader.scanner.detectMarkersPadded(gray, 0))
      if (json.optBoolean("busy", false)) return null
      val markersObj = json.optJSONObject("markers") ?: return emptyMap()
      val out = HashMap<Int, Array<Point>>()
      val keys = markersObj.keys()
      while (keys.hasNext()) {
        val k = keys.next()
        val id = k.toIntOrNull() ?: continue
        val arr = markersObj.getJSONArray(k)
        if (arr.length() == 4) {
          out[id] = Array(4) { idx ->
            val pt = arr.getJSONArray(idx)
            Point(pt.getDouble(0), pt.getDouble(1))
          }
        }
      }
      return out
    }
    return fallbackPreviewPipeline.markerCorners(gray)
  }

  private fun analyze(image: ImageProxy) {
    val now = System.nanoTime()
    if (capturing || now - lastAnalysisNs < 110_000_000L) return
    lastAnalysisNs = now
    val w = image.width
    val h = image.height
    val needed = w * h
    if (yFrameBytes.size != needed) yFrameBytes = ByteArray(needed)

    val plane = image.planes[0]
    val buf = plane.buffer
    val rowStride = plane.rowStride
    if (rowStride == w) {
      buf.position(0)
      buf.get(yFrameBytes, 0, needed)
    } else {
      for (y in 0 until h) {
        buf.position(y * rowStride)
        buf.get(yFrameBytes, y * w, w)
      }
    }
    val gray = Mat(h, w, CvType.CV_8UC1)
    gray.put(0, 0, yFrameBytes)

    val markers: Map<Int, Array<Point>>
    val sharpness: Double
    try {
      val detected = detectPreviewMarkers(gray) ?: return
      markers = detected
      val crop = gray.submat(Rect(w / 4, h / 4, w / 2, h / 2))
      val lap = Mat()
      Imgproc.Laplacian(crop, lap, CvType.CV_32F, 1)
      val mean = MatOfDouble()
      val std = MatOfDouble()
      Core.meanStdDev(lap, mean, std)
      sharpness = std.toArray()[0].let { it * it }
      mean.release()
      std.release()
      lap.release()
      crop.release()
    } finally {
      gray.release()
    }

    val cornerIds = markers.keys.filter { it in 0..3 }
    val questionMarkers = markers.keys.count { it >= 11 }

    val hints = ArrayList<String>()
    var corners: List<Double>? = null
    var phase = "searching"
    if (cornerIds.isNotEmpty() || questionMarkers > 0) phase = "aligning"
    if (cornerIds.size < 4 && markers.isNotEmpty()) hints.add("move-away")

    if (cornerIds.size == 4) {
      val quad = listOf(markers[0]!![0], markers[1]!![1], markers[3]!![2], markers[2]!![3])
      val pts = quad.map { Pair(it.x, it.y) }
      val prev = prevCorners
      val jitter = if (prev == null) 1e9 else pts.indices.maxOf { hypot(pts[it].first - prev[it].first, pts[it].second - prev[it].second) }
      prevCorners = pts
      stableFrames = if (jitter < 14.0) stableFrames + 1 else 0
      val markerSide = markers[0]!!.let { hypot(it[1].x - it[0].x, it[1].y - it[0].y) }
      if (markerSide < 24.0) hints.add("move-closer")
      if (sharpness < 25.0) hints.add("blurry")
      if (stableFrames < 3) hints.add("hold-steady")
      if (markerSide >= 24.0 && sharpness >= 25.0 && stableFrames >= 3) phase = "locked"
      val rot = image.imageInfo.rotationDegrees
      corners = pts.flatMap { (x, y) ->
        val u = x / w
        val v = y / h
        when (rot) {
          90 -> listOf(1 - v, u)
          180 -> listOf(1 - u, 1 - v)
          270 -> listOf(v, 1 - u)
          else -> listOf(u, v)
        }
      }
    } else {
      prevCorners = null
      stableFrames = 0
    }

    emit?.invoke(
      mapOf(
        "phase" to phase,
        "markersFound" to cornerIds.size,
        "questionMarkers" to questionMarkers,
        "hints" to hints,
        "corners" to corners,
        "sharpness" to sharpness,
        "stableFrames" to stableFrames,
      ),
    )
  }

  fun capture(context: Context): String {
    ensureOpenCv()
    val ic = imageCapture ?: throw IllegalStateException("CAMERA_NOT_STARTED")
    capturing = true
    var capturedMat: Mat? = null
    try {
      val latch = CountDownLatch(1)
      var jpegBytes: ByteArray? = null
      var rotationDegrees = 0
      var error: Throwable? = null
      ContextCompat.getMainExecutor(context).execute {
        try {
          ic.takePicture(
            captureExecutor,
            object : ImageCapture.OnImageCapturedCallback() {
              override fun onCaptureSuccess(image: ImageProxy) {
                try {
                  rotationDegrees = image.imageInfo.rotationDegrees
                  if (image.format == ImageFormat.YUV_420_888 && image.planes.size >= 3) {
                    capturedMat = yuv420ToBgrMat(image, rotationDegrees)
                  } else {
                    val b = image.planes[0].buffer
                    jpegBytes = ByteArray(b.remaining()).also { b.get(it) }
                  }
                } catch (t: Throwable) {
                  error = t
                } finally {
                  image.close()
                }
                latch.countDown()
              }

              override fun onError(exception: ImageCaptureException) {
                error = exception
                latch.countDown()
              }
            },
          )
        } catch (e: Throwable) {
          error = e
          latch.countDown()
        }
      }
      if (!latch.await(12, TimeUnit.SECONDS)) throw IllegalStateException("CAPTURE_TIMEOUT")
      error?.let { throw it }

      val matFromYuv = capturedMat
      if (matFromYuv != null) {
        capturedMat = null
        return readMat(context, matFromYuv)
      }
      val bytes = jpegBytes ?: throw IllegalStateException("CAPTURE_EMPTY")
      return readEncoded(context, bytes, fallbackRotationDegrees = rotationDegrees)
    } finally {
      capturedMat?.release()
      capturing = false
      if (stopRequested) ContextCompat.getMainExecutor(context).execute { unbind() }
    }
  }

  /**
   * Decodes JPEG/PNG/WebP bytes in native memory, applies exact EXIF orientation (or CameraX
   * `fallbackRotationDegrees` when the Camera2 HAL omits EXIF orientation), zeroes the byte array,
   * and runs `NativeBlankScanner::process_blank`.
   */
  fun readEncoded(context: Context, encoded: ByteArray, fallbackRotationDegrees: Int = 0): String {
    ensureOpenCv()
    val exifOrientation = try {
      ExifInterface(ByteArrayInputStream(encoded))
        .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_UNDEFINED)
    } catch (_: Throwable) {
      ExifInterface.ORIENTATION_UNDEFINED
    }

    val enc = Mat(1, encoded.size, CvType.CV_8UC1)
    enc.put(0, 0, encoded)
    encoded.fill(0)
    // Ignore OpenCV's internal libjpeg EXIF auto-rotation so we apply exact single-source EXIF/HAL orientation.
    var img = Imgcodecs.imdecode(enc, Imgcodecs.IMREAD_COLOR or Imgcodecs.IMREAD_IGNORE_ORIENTATION)
    enc.release()
    if (img.empty()) {
      img.release()
      throw IllegalStateException("IMAGE_UNREADABLE")
    }

    img = applyOrientation(img, exifOrientation, fallbackRotationDegrees)
    return readMat(context, img)
  }

  private fun readMat(context: Context, rawImg: Mat): String {
    var img = rawImg
    try {
      val longest = maxOf(img.cols(), img.rows())
      if (longest > MAX_SIDE) {
        val scaled = Mat()
        val f = MAX_SIDE.toDouble() / longest
        Imgproc.resize(img, scaled, org.opencv.core.Size(img.cols() * f, img.rows() * f), 0.0, 0.0, Imgproc.INTER_AREA)
        img.release()
        img = scaled
      }
      val result = getReader(context).read(img)
      if (!result.aligned) {
        throw IllegalStateException("NOT_ALIGNED:${result.method}")
      }
      return result.evidence.toString()
    } finally {
      img.release()
    }
  }

  private fun applyOrientation(src: Mat, exifOrientation: Int, fallbackDegrees: Int): Mat {
    if (exifOrientation != ExifInterface.ORIENTATION_UNDEFINED) {
      return when (exifOrientation) {
        ExifInterface.ORIENTATION_NORMAL -> src
        ExifInterface.ORIENTATION_ROTATE_90 -> rotateMat(src, Core.ROTATE_90_CLOCKWISE)
        ExifInterface.ORIENTATION_ROTATE_180 -> rotateMat(src, Core.ROTATE_180)
        ExifInterface.ORIENTATION_ROTATE_270 -> rotateMat(src, Core.ROTATE_90_COUNTERCLOCKWISE)
        ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> flipMat(src, 1)
        ExifInterface.ORIENTATION_FLIP_VERTICAL -> flipMat(src, 0)
        ExifInterface.ORIENTATION_TRANSPOSE -> {
          val transposed = Mat()
          Core.transpose(src, transposed)
          src.release()
          transposed
        }
        ExifInterface.ORIENTATION_TRANSVERSE -> {
          val transposed = Mat()
          Core.transpose(src, transposed)
          src.release()
          rotateMat(transposed, Core.ROTATE_180)
        }
        else -> src
      }
    }
    return when (((fallbackDegrees % 360) + 360) % 360) {
      90 -> rotateMat(src, Core.ROTATE_90_CLOCKWISE)
      180 -> rotateMat(src, Core.ROTATE_180)
      270 -> rotateMat(src, Core.ROTATE_90_COUNTERCLOCKWISE)
      else -> src
    }
  }

  private fun rotateMat(src: Mat, rotateCode: Int): Mat {
    val dst = Mat()
    Core.rotate(src, dst, rotateCode)
    src.release()
    return dst
  }

  private fun flipMat(src: Mat, flipCode: Int): Mat {
    val dst = Mat()
    Core.flip(src, dst, flipCode)
    src.release()
    return dst
  }

  private fun yuv420ToBgrMat(image: ImageProxy, rotationDegrees: Int): Mat {
    val w = image.width
    val h = image.height
    val nv21 = ByteArray(w * h * 3 / 2)

    val yPlane = image.planes[0]
    val uPlane = image.planes[1]
    val vPlane = image.planes[2]

    val yBuf = yPlane.buffer
    val yRowStride = yPlane.rowStride
    var pos = 0
    if (yRowStride == w) {
      yBuf.position(0)
      yBuf.get(nv21, 0, w * h)
      pos = w * h
    } else {
      for (row in 0 until h) {
        yBuf.position(row * yRowStride)
        yBuf.get(nv21, pos, w)
        pos += w
      }
    }

    val uBuf = uPlane.buffer
    val vBuf = vPlane.buffer
    val uvRowStride = uPlane.rowStride
    val uvPixelStride = uPlane.pixelStride
    val chromaH = h / 2
    val chromaW = w / 2
    for (row in 0 until chromaH) {
      val rowStart = row * uvRowStride
      for (col in 0 until chromaW) {
        val idx = rowStart + col * uvPixelStride
        nv21[pos++] = vBuf.get(idx)
        nv21[pos++] = uBuf.get(idx)
      }
    }

    val yuvMat = Mat(h + h / 2, w, CvType.CV_8UC1)
    yuvMat.put(0, 0, nv21)
    nv21.fill(0)
    val bgr = Mat()
    Imgproc.cvtColor(yuvMat, bgr, Imgproc.COLOR_YUV2BGR_NV21)
    yuvMat.release()

    return applyOrientation(bgr, ExifInterface.ORIENTATION_UNDEFINED, rotationDegrees)
  }

  private const val MAX_SIDE = 4200

  @Synchronized
  fun getReader(context: Context): SheetReader {
    reader?.let { return it }
    val manifest = JSONObject(context.assets.open("ocr-manifest.json").bufferedReader().readText())
    val specName = manifest.optString("pipeline_spec", "pipeline_spec.json")
    val defaultKey = manifest.optString("default_model", "int8")
    val models = manifest.getJSONObject("models")
    val chosen = models.getJSONObject(defaultKey)

    val specResolved = ModelStore.resolveAsset(context, specName)
    val modelResolved = ModelStore.resolveAsset(context, chosen.getString("file"), chosen.optString("sha256", null))

    val bridge = NativeBlankScannerBridge(
      modelPath = modelResolved.file.absolutePath,
      specPath = specResolved.file.absolutePath,
      modelSha256 = modelResolved.sha256,
    )
    android.util.Log.i(
      "OcrNative",
      "Initialized C++20 NativeBlankScanner: model=${modelResolved.file.name}, spec=${specResolved.file.name}",
    )
    val built = SheetReader(bridge)
    reader = built
    return built
  }
}
