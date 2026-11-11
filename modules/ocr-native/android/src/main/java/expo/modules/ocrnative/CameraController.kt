package expo.modules.ocrnative

import android.content.Context
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
import androidx.lifecycle.LifecycleOwner
import org.json.JSONObject
import org.opencv.android.OpenCVLoader
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfDouble
import org.opencv.core.Rect
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.hypot

/**
 * Camera + alignment + capture, all inside native memory (ADR 0003).
 *
 * Mobile optimizations for heterogeneous Android hardware:
 * - Single-JNI-call Y-plane copy (`yFrameBytes` reused on `analysisExecutor` — eliminates 960 JNI calls/frame)
 * - Background ONNX Runtime `v4` session creation + XNNPACK warmup when camera starts
 * - Adaptive big.LITTLE thread sizing (`CpuTopology`) + automatic `FP32_XNNPACK -> INT8_CPU` fallback.
 */
object CameraController {
  private val analysisExecutor = Executors.newSingleThreadExecutor()
  private val captureExecutor = Executors.newSingleThreadExecutor()
  private val pipeline by lazy { SheetPipeline() }

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
    // Pre-warm ONNX v4 session & XNNPACK kernels off the UI/analyzer threads while teacher aims camera
    captureExecutor.execute {
      try {
        getReader(appCtx)
      } catch (e: Throwable) {
        android.util.Log.w("OcrCamera", "Reader pre-warm deferred: $e")
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

    val markers = pipeline.markerCorners(gray)
    val cornerIds = markers.keys.filter { it in 0..3 }
    val questionMarkers = markers.keys.count { it >= 11 }

    val crop = gray.submat(Rect(w / 4, h / 4, w / 2, h / 2))
    val lap = Mat()
    Imgproc.Laplacian(crop, lap, CvType.CV_32F, 1)
    val mean = MatOfDouble()
    val std = MatOfDouble()
    Core.meanStdDev(lap, mean, std)
    val sharpness = std.toArray()[0].let { it * it }
    mean.release()
    std.release()
    lap.release()
    crop.release()
    gray.release()

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
    try {
      val latch = CountDownLatch(1)
      var bytes: ByteArray? = null
      var error: Throwable? = null
      ContextCompat.getMainExecutor(context).execute {
        try {
          ic.takePicture(
            captureExecutor,
            object : ImageCapture.OnImageCapturedCallback() {
              override fun onCaptureSuccess(image: ImageProxy) {
                try {
                  val b = image.planes[0].buffer
                  bytes = ByteArray(b.remaining()).also { b.get(it) }
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
      if (!latch.await(10, TimeUnit.SECONDS)) throw IllegalStateException("CAPTURE_TIMEOUT")
      error?.let { throw it }
      return readEncoded(context, bytes ?: throw IllegalStateException("CAPTURE_EMPTY"))
    } finally {
      capturing = false
      if (stopRequested) ContextCompat.getMainExecutor(context).execute { unbind() }
    }
  }

  fun readEncoded(context: Context, encoded: ByteArray): String {
    ensureOpenCv()
    val enc = Mat(1, encoded.size, CvType.CV_8UC1)
    enc.put(0, 0, encoded)
    encoded.fill(0)
    var img = Imgcodecs.imdecode(enc, Imgcodecs.IMREAD_COLOR)
    enc.release()
    if (img.empty()) {
      img.release()
      throw IllegalStateException("IMAGE_UNREADABLE")
    }
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
      if (result.method !in SheetReader.ALIGNED_METHODS) {
        throw IllegalStateException("NOT_ALIGNED:${result.method}")
      }
      return result.evidence.toString()
    } finally {
      img.release()
    }
  }

  private const val MAX_SIDE = 4200

  @Synchronized
  fun getReader(context: Context): SheetReader {
    reader?.let { return it }
    val manifest = JSONObject(context.assets.open("ocr-manifest.json").bufferedReader().readText())
    val alphabet = manifest.getJSONArray("alphabet").let { a -> List(a.length()) { a.getString(it) } }
    val models = manifest.getJSONObject("models")
    val threads = CpuTopology.optimalThreads

    val built = try {
      val fp32 = models.getJSONObject("fp32")
      val file = ModelStore.resolve(context, fp32.getString("file"), fp32.getString("sha256"))
      val engine = OrtEngine(file.absolutePath, OrtEngine.Lane.FP32_XNNPACK, threads)
      engine.warmup()
      android.util.Log.i("OcrNative", "Initialized v4 OCR engine: FP32_XNNPACK (threads=$threads)")
      SheetReader(engine, alphabet, fp32.getString("sha256"))
    } catch (e: Throwable) {
      android.util.Log.w("OcrNative", "FP32_XNNPACK unavailable ($e), falling back to v4 INT8 CPU")
      val int8 = models.getJSONObject("int8")
      val file = ModelStore.resolve(context, int8.getString("file"), int8.getString("sha256"))
      val engine = OrtEngine(file.absolutePath, OrtEngine.Lane.CPU, threads)
      engine.warmup()
      android.util.Log.i("OcrNative", "Initialized v4 OCR engine: INT8_CPU (threads=$threads)")
      SheetReader(engine, alphabet, int8.getString("sha256"))
    }
    reader = built
    return built
  }
}
