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
import org.json.JSONArray
import org.json.JSONObject
import org.opencv.android.OpenCVLoader
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfDouble
import org.opencv.core.Rect
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Camera + alignment + capture, all inside native memory (ADR 0003). Preview frames are shown by the
 * native PreviewView; analysis frames are turned into marker counts and a few numbers; a capture is
 * held only as an in-memory JPEG that is decoded, read and zeroed. JS receives numbers and text only.
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

  @Volatile private var reader: SheetReader? = null
  @Volatile var capturing = false

  @Volatile private var opencvReady = false

  /** OpenCV's native library must be loaded before any Mat is created. */
  @Synchronized
  private fun ensureOpenCv() {
    if (!opencvReady) opencvReady = OpenCVLoader.initLocal()
    check(opencvReady) { "OPENCV_LOAD_FAILED" }
  }

  fun start(context: Context, owner: LifecycleOwner, previewView: PreviewView, onAlignment: (Map<String, Any?>) -> Unit) {
    ensureOpenCv()
    stopRequested = false
    emit = onAlignment
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      val p = future.get()
      provider = p
      val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
      val analysis = ImageAnalysis.Builder()
        .setResolutionSelector(ResolutionSelector.Builder().setResolutionStrategy(
          ResolutionStrategy(Size(1280, 960), ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER)).build())
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .build()
      analysis.setAnalyzer(analysisExecutor) { image ->
        try { analyze(image) } catch (e: Throwable) { android.util.Log.w("OcrCamera", "analysis skipped: $e") } finally { image.close() }
      }
      val capture = ImageCapture.Builder()
        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
        .setResolutionSelector(ResolutionSelector.Builder().setResolutionStrategy(
          ResolutionStrategy(Size(4000, 3000), ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER)).build())
        .build()
      p.unbindAll()
      p.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis, capture)
      imageCapture = capture
    }, ContextCompat.getMainExecutor(context))
  }

  @Volatile private var stopRequested = false

  /** Stops the camera; if a capture is in flight, the stop is deferred until it finishes. */
  fun stop() {
    if (capturing) { stopRequested = true; return }
    unbind()
  }

  private fun unbind() {
    stopRequested = false
    provider?.unbindAll(); provider = null; imageCapture = null; emit = null
    prevCorners = null; stableFrames = 0
  }

  private fun analyze(image: ImageProxy) {
    val now = System.nanoTime()
    if (capturing || now - lastAnalysisNs < 110_000_000L) return
    lastAnalysisNs = now
    val w = image.width; val h = image.height
    val plane = image.planes[0]
    val gray = Mat(h, w, CvType.CV_8UC1)
    val buf = plane.buffer
    val row = ByteArray(w)
    for (y in 0 until h) { buf.position(y * plane.rowStride); buf.get(row, 0, w); gray.put(y, 0, row) }

    val markers = pipeline.markerCorners(gray)
    val cornerIds = markers.keys.filter { it in 0..3 }
    val questionMarkers = markers.keys.count { it >= 11 }

    // sharpness: variance of the Laplacian on the centre crop
    val crop = gray.submat(Rect(w / 4, h / 4, w / 2, h / 2))
    val lap = Mat(); Imgproc.Laplacian(crop, lap, CvType.CV_32F, 1)
    val mean = MatOfDouble(); val std = MatOfDouble(); Core.meanStdDev(lap, mean, std)
    val sharpness = std.toArray()[0].let { it * it }
    lap.release(); crop.release(); gray.release()

    val hints = ArrayList<String>()
    var corners: List<Double>? = null
    var phase = "searching"
    if (cornerIds.isNotEmpty() || questionMarkers > 0) phase = "aligning"
    if (cornerIds.size < 4 && markers.isNotEmpty()) hints.add("move-away")

    if (cornerIds.size == 4) {
      val quad = listOf(markers[0]!![0], markers[1]!![1], markers[3]!![2], markers[2]!![3])
      val pts = quad.map { Pair(it.x, it.y) }
      val prev = prevCorners
      val jitter = if (prev == null) 1e9 else pts.indices.maxOf { Math.hypot(pts[it].first - prev[it].first, pts[it].second - prev[it].second) }
      prevCorners = pts
      stableFrames = if (jitter < 14.0) stableFrames + 1 else 0
      val markerSide = markers[0]!!.let { Math.hypot(it[1].x - it[0].x, it[1].y - it[0].y) }
      if (markerSide < 24.0) hints.add("move-closer")
      if (sharpness < 25.0) hints.add("blurry")
      if (stableFrames < 3) hints.add("hold-steady")
      if (markerSide >= 24.0 && sharpness >= 25.0 && stableFrames >= 3) phase = "locked"
      android.util.Log.d("OcrCamera", "corners=4 sharp=%.0f jitter=%.1f side=%.0f stable=%d phase=%s".format(sharpness, jitter, markerSide, stableFrames, phase))
      val rot = image.imageInfo.rotationDegrees
      corners = pts.flatMap { (x, y) ->
        val u = x / w; val v = y / h
        when (rot) { 90 -> listOf(1 - v, u); 180 -> listOf(1 - u, 1 - v); 270 -> listOf(v, 1 - u); else -> listOf(u, v) }
      }
    } else { prevCorners = null; stableFrames = 0 }

    emit?.invoke(mapOf(
      "phase" to phase, "markersFound" to cornerIds.size, "questionMarkers" to questionMarkers,
      "hints" to hints, "corners" to corners, "sharpness" to sharpness, "stableFrames" to stableFrames,
    ))
  }

  /** Blocks until a still is captured (in memory), read and released. Returns evidence JSON. */
  fun capture(context: Context): String {
    ensureOpenCv()
    val ic = imageCapture ?: throw IllegalStateException("CAMERA_NOT_STARTED")
    capturing = true
    try {
      val latch = CountDownLatch(1)
      var bytes: ByteArray? = null
      var error: Throwable? = null
      // CameraX requires takePicture on the main thread; the callback runs on our capture executor.
      ContextCompat.getMainExecutor(context).execute {
        try {
        ic.takePicture(captureExecutor, object : ImageCapture.OnImageCapturedCallback() {
          override fun onCaptureSuccess(image: ImageProxy) {
            try { val b = image.planes[0].buffer; bytes = ByteArray(b.remaining()).also { b.get(it) } } finally { image.close() }
            latch.countDown()
          }
          override fun onError(exception: ImageCaptureException) { error = exception; latch.countDown() }
        })
        } catch (e: Throwable) { error = e; latch.countDown() }
      }
      if (!latch.await(10, TimeUnit.SECONDS)) throw IllegalStateException("CAPTURE_TIMEOUT")
      error?.let { throw it }
      val jpeg = bytes ?: throw IllegalStateException("CAPTURE_EMPTY")
      val enc = Mat(1, jpeg.size, CvType.CV_8UC1); enc.put(0, 0, jpeg); jpeg.fill(0)
      val img = Imgcodecs.imdecode(enc, Imgcodecs.IMREAD_COLOR); enc.release()
      try {
        val result = getReader(context).read(img)
        if (result.method != "aruco-4-point" && result.method != "marker-homography") {
          throw IllegalStateException("NOT_ALIGNED:${result.method}")
        }
        return result.evidence.toString()
      } finally { img.release() }
    } finally {
      capturing = false
      // unbindAll must run on the main thread
      if (stopRequested) ContextCompat.getMainExecutor(context).execute { unbind() }
    }
  }

  private fun getReader(context: Context): SheetReader {
    reader?.let { return it }
    val manifest = JSONObject(context.assets.open("ocr-manifest.json").bufferedReader().readText())
    val alphabet = manifest.getJSONArray("alphabet").let { a -> List(a.length()) { a.getString(it) } }
    val fp32 = manifest.getJSONObject("models").getJSONObject("fp32")
    val modelFile = File(context.filesDir, "ocr-lab/models/${fp32.getString("file")}")
    val engine = OrtEngine(modelFile.absolutePath, OrtEngine.Lane.FP32_XNNPACK, 6)
    return SheetReader(engine, alphabet, fp32.getString("sha256")).also { reader = it }
  }
}
