package expo.modules.ocrnative

import android.content.Context
import android.graphics.ImageFormat
import android.hardware.camera2.CaptureRequest
import android.util.Log
import android.util.Size
import androidx.annotation.OptIn
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.Camera
import androidx.camera.core.CameraControl
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalZeroShutterLag
import androidx.camera.core.FocusMeteringAction
import androidx.camera.core.FocusMeteringResult
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.SurfaceOrientedMeteringPointFactory
import androidx.camera.core.resolutionselector.AspectRatioStrategy
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
import org.opencv.core.MatOfFloat
import org.opencv.core.MatOfInt
import org.opencv.core.Point
import org.opencv.core.Rect
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import java.io.ByteArrayInputStream
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.hypot
import kotlin.math.roundToInt

/**
 * Pro Document Scanner CameraX 1.6.2 + alignment + capture pipeline, strictly inside native memory (ADR 0003 & ADR 0006):
 *
 * - Unified 4:3 `AspectRatioStrategy` across `Preview` (`FIT_CENTER`), `ImageAnalysis` (`1280x960`),
 *   and `ImageCapture` (`4200x3150`, `PREFER_HIGHER_RESOLUTION_OVER_CAPTURE_RATE`, `JPEG 95`).
 * - Hybrid capture mode: `CAPTURE_MODE_ZERO_SHUTTER_LAG` when `isZslSupported && !torchRequested`,
 *   switching to `CAPTURE_MODE_MAXIMIZE_QUALITY` when torch is active or ZSL is unsupported.
 * - `Camera2Interop` ISP tuning: `EDGE_MODE_HIGH_QUALITY` + `NOISE_REDUCTION_MODE_FAST` (preserves thin strokes
 *   and Tatar diacritics) + `+0.5 EV` white-paper exposure compensation.
 * - Active sheet-centroid `FocusMeteringAction` (`FLAG_AF | FLAG_AE`), tap-to-focus on `PreviewView`,
 *   and bounded pre-shutter AF convergence wait (`<= 1200 ms`).
 * - Noise-immune real-time DQA (`GaussianBlur(5x5)` + `Sobel(3x3) P99` sharpness, tilt, darkness, localized hotspot glare)
 *   plus post-capture full-res blur gate with `1x` silent auto-retry.
 * - Numeric-only `OcrCamera` telemetry (zero pixels, zero student PII).
 */
object CameraController {
  private const val TAG = "OcrCamera"
  private const val MAX_SIDE = 4200
  private const val ANALYSIS_INTERVAL_NS = 110_000_000L
  private const val MIN_MARKER_SIDE_PX = 24.0
  private const val MAX_JITTER_PX = 6.0
  private const val REQUIRED_STABLE_FRAMES = 4
  private const val MIN_SHARPNESS_P99 = 62.0
  private const val MIN_CAPTURE_SHARPNESS_P99 = 52.0
  private const val MAX_TILT_RATIO = 1.38
  private const val MIN_MEAN_LUMA = 72.0
  private const val GLARE_MAX_PATCH_LUMA = 238.0
  private const val GLARE_HOTSPOT_DELTA = 26.0
  private const val TARGET_WHITE_PAPER_EV = 0.5f
  private const val AF_COOLDOWN_NS = 2_200_000_000L
  private const val AF_FRESH_WINDOW_NS = 1_800_000_000L
  private const val AF_CONVERGENCE_TIMEOUT_MS = 1200L

  private val analysisExecutor = Executors.newSingleThreadExecutor()
  private val captureExecutor = Executors.newSingleThreadExecutor()
  private val fallbackPreviewPipeline by lazy { SheetPipeline() }

  @Volatile private var provider: ProcessCameraProvider? = null
  @Volatile private var boundContext: Context? = null
  @Volatile private var boundOwner: LifecycleOwner? = null
  @Volatile private var boundPreviewView: PreviewView? = null
  @Volatile private var camera: Camera? = null
  @Volatile private var imageCapture: ImageCapture? = null
  @Volatile private var analysisUseCase: ImageAnalysis? = null
  @Volatile private var emit: ((Map<String, Any?>) -> Unit)? = null

  @Volatile private var zslSupported = false
  @Volatile private var captureModeLabel = "HQ"
  @Volatile private var torchRequested = false
  @Volatile private var requestedZoomRatio = 1.0f
  @Volatile private var currentZoomRatio = 1.0f
  @Volatile private var appliedEvIndex = 0

  @Volatile private var afInFlight = false
  @Volatile private var afLocked = false
  @Volatile private var lastFocusTriggerNs = 0L
  @Volatile private var lastFocusSuccessNs = 0L
  @Volatile private var lastFocusTarget: Pair<Float, Float>? = null
  @Volatile private var lastAnalysisSize: Pair<Int, Int> = Pair(1280, 960)

  private var lastAnalysisNs = 0L
  private var prevCorners: List<Pair<Double, Double>>? = null
  private var stableFrames = 0
  private var yFrameBytes = ByteArray(0)

  @Volatile private var reader: SheetReader? = null
  @Volatile var capturing = false
  @Volatile private var stopRequested = false
  @Volatile private var opencvReady = false

  @Synchronized
  private fun ensureOpenCv() {
    if (!opencvReady) opencvReady = OpenCVLoader.initLocal()
    check(opencvReady) { "OPENCV_LOAD_FAILED" }
  }

  fun start(
    context: Context,
    owner: LifecycleOwner,
    previewView: PreviewView,
    onAlignment: (Map<String, Any?>) -> Unit,
  ) {
    ensureOpenCv()
    stopRequested = false
    emit = onAlignment
    boundContext = context
    boundOwner = owner
    boundPreviewView = previewView
    val appCtx = context.applicationContext ?: context

    captureExecutor.execute {
      try {
        getReader(appCtx)
      } catch (e: Throwable) {
        Log.w(TAG, "NativeBlankScanner pre-warm deferred: $e")
      }
    }

    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      try {
        val p = future.get()
        provider = p
        bindUseCases(context, owner, previewView, p)
      } catch (e: Throwable) {
        Log.e(TAG, "Failed to bind CameraX use cases: $e")
      }
    }, ContextCompat.getMainExecutor(context))
  }

  @OptIn(ExperimentalZeroShutterLag::class, ExperimentalCamera2Interop::class)
  private fun bindUseCases(
    context: Context,
    owner: LifecycleOwner,
    previewView: PreviewView,
    p: ProcessCameraProvider,
  ) {
    val camInfo = try {
      p.getCameraInfo(CameraSelector.DEFAULT_BACK_CAMERA)
    } catch (_: Throwable) {
      null
    }
    zslSupported = camInfo?.isZslSupported == true
    val useZsl = zslSupported && !torchRequested
    captureModeLabel = if (useZsl) "ZSL" else "HQ"

    val previewSelector = ResolutionSelector.Builder()
      .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
      .build()
    val preview = Preview.Builder()
      .setResolutionSelector(previewSelector)
      .build()
      .also { it.surfaceProvider = previewView.surfaceProvider }

    val analysisSelector = ResolutionSelector.Builder()
      .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
      .setResolutionStrategy(
        ResolutionStrategy(
          Size(1280, 960),
          ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER,
        ),
      )
      .build()
    val analysis = ImageAnalysis.Builder()
      .setResolutionSelector(analysisSelector)
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .build()
    analysis.setAnalyzer(analysisExecutor) { image ->
      try {
        analyze(image)
      } catch (e: Throwable) {
        Log.w(TAG, "analysis skipped: $e")
      } finally {
        image.close()
      }
    }

    val captureSelector = ResolutionSelector.Builder()
      .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
      .setResolutionStrategy(
        ResolutionStrategy(
          Size(4200, 3150),
          ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER,
        ),
      )
      .setAllowedResolutionMode(ResolutionSelector.PREFER_HIGHER_RESOLUTION_OVER_CAPTURE_RATE)
      .build()

    val captureBuilder = ImageCapture.Builder()
      .setCaptureMode(
        if (useZsl) ImageCapture.CAPTURE_MODE_ZERO_SHUTTER_LAG
        else ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY,
      )
      .setJpegQuality(95)
      .setResolutionSelector(captureSelector)

    Camera2Interop.Extender(captureBuilder)
      .setCaptureRequestOption(CaptureRequest.EDGE_MODE, CaptureRequest.EDGE_MODE_HIGH_QUALITY)
      .setCaptureRequestOption(
        CaptureRequest.NOISE_REDUCTION_MODE,
        CaptureRequest.NOISE_REDUCTION_MODE_FAST,
      )

    val capture = captureBuilder.build()

    p.unbindAll()
    val boundCam = p.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis, capture)
    camera = boundCam
    imageCapture = capture
    analysisUseCase = analysis

    applyWhitePaperExposure(boundCam)
    applyZoomInternal(boundCam, requestedZoomRatio)
    if (boundCam.cameraInfo.hasFlashUnit()) {
      boundCam.cameraControl.enableTorch(torchRequested)
    } else {
      torchRequested = false
    }

    val maxZoom = boundCam.cameraInfo.zoomState.value?.maxZoomRatio ?: 1.0f
    Log.i(
      TAG,
      "bound mode=$captureModeLabel zslSupported=$zslSupported hasFlash=${boundCam.cameraInfo.hasFlashUnit()} " +
        "evIdx=$appliedEvIndex zoom=${"%.2f".format(Locale.US, currentZoomRatio)} maxZoom=${"%.2f".format(Locale.US, maxZoom)} torch=$torchRequested",
    )
  }

  private fun applyWhitePaperExposure(cam: Camera) {
    val exp = cam.cameraInfo.exposureState
    if (!exp.isExposureCompensationSupported) {
      appliedEvIndex = 0
      return
    }
    val step = exp.exposureCompensationStep.toFloat()
    if (step <= 0f) {
      appliedEvIndex = 0
      return
    }
    val rawIdx = (TARGET_WHITE_PAPER_EV / step).roundToInt()
    val clamped = rawIdx.coerceIn(exp.exposureCompensationRange.lower, exp.exposureCompensationRange.upper)
    appliedEvIndex = clamped
    cam.cameraControl.setExposureCompensationIndex(clamped)
  }

  private fun applyZoomInternal(cam: Camera, desiredRatio: Float): Float {
    val zoomState = cam.cameraInfo.zoomState.value
    val minZ = zoomState?.minZoomRatio ?: 1.0f
    val maxZ = zoomState?.maxZoomRatio ?: 1.0f
    val clamped = desiredRatio.coerceIn(minZ, maxZ)
    currentZoomRatio = clamped
    cam.cameraControl.setZoomRatio(clamped)
    return clamped
  }

  fun setTorch(context: Context, enabled: Boolean): Boolean {
    val latch = CountDownLatch(1)
    var result = false
    ContextCompat.getMainExecutor(context).execute {
      try {
        val cam = camera
        val p = provider
        val owner = boundOwner
        val pv = boundPreviewView
        if (cam == null || !cam.cameraInfo.hasFlashUnit()) {
          torchRequested = false
          result = false
        } else {
          val modeNeedsRebind = zslSupported && (torchRequested != enabled) && !capturing
          torchRequested = enabled
          if (modeNeedsRebind && p != null && owner != null && pv != null) {
            bindUseCases(context, owner, pv, p)
          } else {
            cam.cameraControl.enableTorch(enabled)
          }
          result = torchRequested
          Log.i(TAG, "setTorch enabled=$result mode=$captureModeLabel")
        }
      } catch (e: Throwable) {
        Log.w(TAG, "setTorch failed: $e")
        result = false
      } finally {
        latch.countDown()
      }
    }
    latch.await(2, TimeUnit.SECONDS)
    return result
  }

  fun setZoom(context: Context, ratio: Double): Double {
    val desired = ratio.toFloat().coerceIn(1.0f, 3.0f)
    requestedZoomRatio = desired
    val latch = CountDownLatch(1)
    var applied = desired.toDouble()
    ContextCompat.getMainExecutor(context).execute {
      try {
        val cam = camera
        if (cam != null) {
          applied = applyZoomInternal(cam, desired).toDouble()
          Log.i(TAG, "setZoom ratio=${"%.2f".format(Locale.US, applied)}")
        }
      } catch (e: Throwable) {
        Log.w(TAG, "setZoom failed: $e")
      } finally {
        latch.countDown()
      }
    }
    latch.await(2, TimeUnit.SECONDS)
    return applied
  }

  fun getCapabilities(): Map<String, Any> {
    val cam = camera
    val ready = cam != null
    val hasFlash = if (cam != null) cam.cameraInfo.hasFlashUnit() else true
    val maxZoom = (cam?.cameraInfo?.zoomState?.value?.maxZoomRatio ?: 4.0f).toDouble()
    return mapOf(
      "ready" to ready,
      "hasFlash" to hasFlash,
      "torchEnabled" to torchRequested,
      "zoomRatio" to currentZoomRatio.toDouble(),
      "maxZoomRatio" to maxZoom,
      "zslSupported" to zslSupported,
      "captureMode" to captureModeLabel,
    )
  }

  fun focusAt(previewView: PreviewView, x: Float, y: Float) {
    val cam = camera ?: return
    if (previewView.width <= 0 || previewView.height <= 0) return
    val point = previewView.meteringPointFactory.createPoint(x, y, 0.18f)
    val action = FocusMeteringAction.Builder(
      point,
      FocusMeteringAction.FLAG_AF or FocusMeteringAction.FLAG_AE,
    )
      .setAutoCancelDuration(3, TimeUnit.SECONDS)
      .build()
    startFocusAction(cam, action, reason = "tap")
  }

  private fun maybeAutoFocusOnSheet(pts: List<Pair<Double, Double>>, w: Int, h: Int, sharpness: Double) {
    val cam = camera ?: return
    val analysis = analysisUseCase ?: return
    val now = System.nanoTime()
    if (afInFlight || now - lastFocusTriggerNs < AF_COOLDOWN_NS) return

    val cx = pts.map { it.first }.average().toFloat().coerceIn(0f, w.toFloat())
    val cy = pts.map { it.second }.average().toFloat().coerceIn(0f, h.toFloat())
    val prevTarget = lastFocusTarget
    val movedFar = prevTarget == null || hypot((cx - prevTarget.first).toDouble(), (cy - prevTarget.second).toDouble()) > 48.0
    val staleOrSoft = !afLocked || sharpness < 78.0 || (now - lastFocusSuccessNs > 4_000_000_000L)
    if (!movedFar && !staleOrSoft) return

    lastFocusTarget = Pair(cx, cy)
    lastAnalysisSize = Pair(w, h)
    val factory = SurfaceOrientedMeteringPointFactory(w.toFloat(), h.toFloat(), analysis)
    val point = factory.createPoint(cx, cy, 0.22f)
    val action = FocusMeteringAction.Builder(
      point,
      FocusMeteringAction.FLAG_AF or FocusMeteringAction.FLAG_AE,
    )
      .setAutoCancelDuration(4, TimeUnit.SECONDS)
      .build()
    startFocusAction(cam, action, reason = "sheet-roi")
  }

  private fun startFocusAction(cam: Camera, action: FocusMeteringAction, reason: String): CountDownLatch {
    val doneLatch = CountDownLatch(1)
    afInFlight = true
    lastFocusTriggerNs = System.nanoTime()
    val ctx = boundContext
    val executor = if (ctx != null) ContextCompat.getMainExecutor(ctx) else captureExecutor
    try {
      val future = cam.cameraControl.startFocusAndMetering(action)
      future.addListener({
        try {
          val res: FocusMeteringResult = future.get()
          afLocked = res.isFocusSuccessful
          if (res.isFocusSuccessful) {
            lastFocusSuccessNs = System.nanoTime()
          }
          Log.d(TAG, "af done reason=$reason focused=${res.isFocusSuccessful}")
        } catch (e: Throwable) {
          // OperationCanceledException is normal when superseded or on fixed-focus lenses.
          if (e.cause !is CameraControl.OperationCanceledException) {
            Log.d(TAG, "af skipped reason=$reason err=${e.javaClass.simpleName}")
          }
        } finally {
          afInFlight = false
          doneLatch.countDown()
        }
      }, executor)
    } catch (e: Throwable) {
      afInFlight = false
      doneLatch.countDown()
    }
    return doneLatch
  }

  private fun awaitFocusBeforeCapture(context: Context, forceRefocus: Boolean) {
    val cam = camera ?: return
    val now = System.nanoTime()
    if (!forceRefocus && afLocked && !afInFlight && (now - lastFocusSuccessNs) < AF_FRESH_WINDOW_NS) {
      return
    }
    val latch = CountDownLatch(1)
    ContextCompat.getMainExecutor(context).execute {
      try {
        val analysis = analysisUseCase
        val (aw, ah) = lastAnalysisSize
        val target = lastFocusTarget
        val point = if (analysis != null && aw > 0 && ah > 0) {
          val factory = SurfaceOrientedMeteringPointFactory(aw.toFloat(), ah.toFloat(), analysis)
          factory.createPoint(target?.first ?: (aw * 0.5f), target?.second ?: (ah * 0.5f), 0.22f)
        } else {
          SurfaceOrientedMeteringPointFactory(1f, 1f).createPoint(0.5f, 0.5f, 0.22f)
        }
        val action = FocusMeteringAction.Builder(
          point,
          FocusMeteringAction.FLAG_AF or FocusMeteringAction.FLAG_AE,
        )
          .setAutoCancelDuration(3, TimeUnit.SECONDS)
          .build()
        val innerLatch = startFocusAction(cam, action, reason = if (forceRefocus) "retry-pre-capture" else "pre-capture")
        captureExecutor.execute {
          innerLatch.await(AF_CONVERGENCE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
          latch.countDown()
        }
      } catch (_: Throwable) {
        latch.countDown()
      }
    }
    latch.await(AF_CONVERGENCE_TIMEOUT_MS + 150L, TimeUnit.MILLISECONDS)
  }

  fun stop() {
    if (capturing) {
      stopRequested = true
      return
    }
    unbind()
  }

  private fun unbind() {
    stopRequested = false
    try {
      if (torchRequested) {
        camera?.cameraControl?.enableTorch(false)
      }
    } catch (_: Throwable) {}
    provider?.unbindAll()
    provider = null
    boundContext = null
    boundOwner = null
    boundPreviewView = null
    camera = null
    imageCapture = null
    analysisUseCase = null
    emit = null
    prevCorners = null
    stableFrames = 0
    torchRequested = false
    requestedZoomRatio = 1.0f
    currentZoomRatio = 1.0f
    appliedEvIndex = 0
    afInFlight = false
    afLocked = false
    lastFocusTriggerNs = 0L
    lastFocusSuccessNs = 0L
    lastFocusTarget = null
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

  /**
   * Computes noise-immune 99th-percentile Sobel edge gradient (`0..255`) after `GaussianBlur(5x5, sigma=1.0)`,
   * plus mean luminance and localized specular hotspot glare inside `roi`.
   */
  private data class RoiDqa(
    val sharpnessP99: Double,
    val meanLuma: Double,
    val hasGlare: Boolean,
  )

  private fun evaluateRoiDqa(gray: Mat, roiRect: Rect): RoiDqa {
    val safeX = roiRect.x.coerceIn(0, (gray.cols() - 16).coerceAtLeast(0))
    val safeY = roiRect.y.coerceIn(0, (gray.rows() - 16).coerceAtLeast(0))
    val safeW = roiRect.width.coerceIn(16, gray.cols() - safeX)
    val safeH = roiRect.height.coerceIn(16, gray.rows() - safeY)
    val roi = gray.submat(Rect(safeX, safeY, safeW, safeH))

    val den = Mat()
    val gx = Mat()
    val gy = Mat()
    val absGx = Mat()
    val absGy = Mat()
    val grad = Mat()
    val hist = Mat()
    val channels = MatOfInt(0)
    val histSize = MatOfInt(256)
    val ranges = MatOfFloat(0f, 256f)

    try {
      val meanLuma = Core.mean(roi).`val`[0]

      Imgproc.GaussianBlur(roi, den, org.opencv.core.Size(5.0, 5.0), 1.0)
      Imgproc.Sobel(den, gx, CvType.CV_16S, 1, 0, 3)
      Imgproc.Sobel(den, gy, CvType.CV_16S, 0, 1, 3)
      Core.convertScaleAbs(gx, absGx)
      Core.convertScaleAbs(gy, absGy)
      Core.addWeighted(absGx, 0.5, absGy, 0.5, 0.0, grad)

      Imgproc.calcHist(listOf(grad), channels, Mat(), hist, histSize, ranges)
      val bins = FloatArray(256)
      hist.get(0, 0, bins)
      val target = grad.rows().toDouble() * grad.cols().toDouble() * 0.99
      var cum = 0.0
      var p99 = 255.0
      for (i in 0 until 256) {
        cum += bins[i]
        if (cum >= target) {
          p99 = i.toDouble()
          break
        }
      }

      // 6x6 patch check for localized specular glare (prevents false positives on clean bright white paper)
      var hasGlare = false
      val gh = safeH / 6
      val gw = safeW / 6
      if (gh >= 8 && gw >= 8) {
        val patchMeans = DoubleArray(36)
        var maxPatch = 0.0
        var idx = 0
        for (r in 0 until 6) {
          for (c in 0 until 6) {
            val patch = roi.submat(Rect(c * gw, r * gh, gw, gh))
            val m = Core.mean(patch).`val`[0]
            patch.release()
            patchMeans[idx++] = m
            if (m > maxPatch) maxPatch = m
          }
        }
        patchMeans.sort()
        val medianPatch = (patchMeans[17] + patchMeans[18]) * 0.5
        hasGlare = maxPatch > GLARE_MAX_PATCH_LUMA && (maxPatch - medianPatch) > GLARE_HOTSPOT_DELTA
      }

      return RoiDqa(sharpnessP99 = p99, meanLuma = meanLuma, hasGlare = hasGlare)
    } finally {
      ranges.release()
      histSize.release()
      channels.release()
      hist.release()
      grad.release()
      absGy.release()
      absGx.release()
      gy.release()
      gx.release()
      den.release()
      roi.release()
    }
  }

  private fun analyze(image: ImageProxy) {
    val now = System.nanoTime()
    if (capturing || now - lastAnalysisNs < ANALYSIS_INTERVAL_NS) return
    lastAnalysisNs = now
    val w = image.width
    val h = image.height
    lastAnalysisSize = Pair(w, h)
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
    val dqa: RoiDqa
    try {
      val detected = detectPreviewMarkers(gray) ?: return
      markers = detected
      val cornerIdsPresent = markers.keys.filter { it in 0..3 }
      val roiRect = if (cornerIdsPresent.size == 4) {
        val xs = listOf(markers[0]!![0].x, markers[1]!![1].x, markers[3]!![2].x, markers[2]!![3].x)
        val ys = listOf(markers[0]!![0].y, markers[1]!![1].y, markers[3]!![2].y, markers[2]!![3].y)
        val minX = xs.minOrNull()!!.toInt()
        val maxX = xs.maxOrNull()!!.toInt()
        val minY = ys.minOrNull()!!.toInt()
        val maxY = ys.maxOrNull()!!.toInt()
        val padX = ((maxX - minX) * 0.08).toInt()
        val padY = ((maxY - minY) * 0.08).toInt()
        Rect(minX + padX, minY + padY, (maxX - minX - 2 * padX).coerceAtLeast(32), (maxY - minY - 2 * padY).coerceAtLeast(32))
      } else {
        Rect(w / 4, h / 4, w / 2, h / 2)
      }
      dqa = evaluateRoiDqa(gray, roiRect)
    } finally {
      gray.release()
    }

    val cornerIds = markers.keys.filter { it in 0..3 }
    val questionMarkers = markers.keys.count { it >= 11 }

    val hints = ArrayList<String>()
    var corners: List<Double>? = null
    var phase = "searching"
    if (cornerIds.isNotEmpty() || questionMarkers > 0) phase = "aligning"
    if (cornerIds.size < 4) {
      if (dqa.meanLuma < 65.0) hints.add("too-dark")
      else if (markers.isNotEmpty()) hints.add("move-away")
    }

    if (cornerIds.size == 4) {
      val quad = listOf(markers[0]!![0], markers[1]!![1], markers[3]!![2], markers[2]!![3])
      val pts = quad.map { Pair(it.x, it.y) }
      maybeAutoFocusOnSheet(pts, w, h, dqa.sharpnessP99)

      val prev = prevCorners
      val jitter = if (prev == null) 1e9 else pts.indices.maxOf {
        hypot(pts[it].first - prev[it].first, pts[it].second - prev[it].second)
      }
      prevCorners = pts
      stableFrames = if (jitter < MAX_JITTER_PX) stableFrames + 1 else 0

      val markerSide = markers[0]!!.let { hypot(it[1].x - it[0].x, it[1].y - it[0].y) }
      val topW = hypot(pts[1].first - pts[0].first, pts[1].second - pts[0].second)
      val botW = hypot(pts[2].first - pts[3].first, pts[2].second - pts[3].second)
      val leftH = hypot(pts[3].first - pts[0].first, pts[3].second - pts[0].second)
      val rightH = hypot(pts[2].first - pts[1].first, pts[2].second - pts[1].second)
      val horizRatio = maxOf(topW, botW) / minOf(topW, botW).coerceAtLeast(1.0)
      val vertRatio = maxOf(leftH, rightH) / minOf(leftH, rightH).coerceAtLeast(1.0)
      val tiltRatio = maxOf(horizRatio, vertRatio)

      if (markerSide < MIN_MARKER_SIDE_PX) hints.add("move-closer")
      if (tiltRatio > MAX_TILT_RATIO) hints.add("tilted")
      if (dqa.meanLuma < MIN_MEAN_LUMA) hints.add("too-dark")
      if (dqa.hasGlare) hints.add("glare")
      if (dqa.sharpnessP99 < MIN_SHARPNESS_P99) hints.add("blurry")
      if (stableFrames < REQUIRED_STABLE_FRAMES || afInFlight) hints.add("hold-steady")

      if (hints.isEmpty()) phase = "locked"

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
        "sharpness" to dqa.sharpnessP99,
        "stableFrames" to stableFrames,
      ),
    )
  }

  private fun measureCaptureSharpnessP99(uprightBgr: Mat): Double {
    val previewScaled = Mat()
    val gray = Mat()
    try {
      val targetW = if (uprightBgr.cols() <= uprightBgr.rows()) 960.0 else 1280.0
      val targetH = if (uprightBgr.cols() <= uprightBgr.rows()) 1280.0 else 960.0
      Imgproc.resize(uprightBgr, previewScaled, org.opencv.core.Size(targetW, targetH), 0.0, 0.0, Imgproc.INTER_AREA)
      Imgproc.cvtColor(previewScaled, gray, Imgproc.COLOR_BGR2GRAY)
      val w = gray.cols()
      val h = gray.rows()
      return evaluateRoiDqa(gray, Rect(w / 4, h / 4, w / 2, h / 2)).sharpnessP99
    } finally {
      gray.release()
      previewScaled.release()
    }
  }

  fun capture(context: Context): String {
    ensureOpenCv()
    val ic = imageCapture ?: throw IllegalStateException("CAMERA_NOT_STARTED")
    capturing = true
    try {
      for (attempt in 0..1) {
        awaitFocusBeforeCapture(context, forceRefocus = attempt > 0)

        val latch = CountDownLatch(1)
        var capturedMat: Mat? = null
        var jpegBytes: ByteArray? = null
        var rotationDegrees = 0
        var rawW = 0
        var rawH = 0
        var fmtLabel = "JPEG"
        var error: Throwable? = null

        ContextCompat.getMainExecutor(context).execute {
          try {
            ic.takePicture(
              captureExecutor,
              object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                  try {
                    rotationDegrees = image.imageInfo.rotationDegrees
                    rawW = image.width
                    rawH = image.height
                    if (image.format == ImageFormat.YUV_420_888 && image.planes.size >= 3) {
                      fmtLabel = "YUV_420_888"
                      capturedMat = yuv420ToBgrMat(image, rotationDegrees)
                    } else {
                      fmtLabel = "JPEG(${image.format})"
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

        if (!latch.await(12, TimeUnit.SECONDS)) {
          capturedMat?.release()
          throw IllegalStateException("CAPTURE_TIMEOUT")
        }
        error?.let {
          capturedMat?.release()
          throw it
        }

        var exifOrientation = ExifInterface.ORIENTATION_UNDEFINED
        val byteLen = jpegBytes?.size ?: 0
        var img: Mat = if (capturedMat != null) {
          val m = capturedMat!!
          capturedMat = null
          m
        } else {
          val bytes = jpegBytes ?: throw IllegalStateException("CAPTURE_EMPTY")
          val decoded = decodeEncodedUpright(bytes, rotationDegrees)
          exifOrientation = decoded.second
          decoded.first
        }

        try {
          img = clampMaxSide(img)
          val sharpP99 = measureCaptureSharpnessP99(img)
          Log.i(
            TAG,
            "capture attempt=${attempt + 1} mode=$captureModeLabel fmt=$fmtLabel raw=${rawW}x${rawH} " +
              "upright=${img.cols()}x${img.rows()} rot=$rotationDegrees exif=$exifOrientation bytes=$byteLen " +
              "sharpP99=${"%.1f".format(Locale.US, sharpP99)} afLocked=$afLocked evIdx=$appliedEvIndex " +
              "zoom=${"%.2f".format(Locale.US, currentZoomRatio)} torch=$torchRequested",
          )

          if (attempt == 0 && sharpP99 < MIN_CAPTURE_SHARPNESS_P99) {
            Log.w(
              TAG,
              "capture blurry (sharpP99=${"%.1f".format(Locale.US, sharpP99)} < $MIN_CAPTURE_SHARPNESS_P99); performing 1x silent retry",
            )
            img.release()
            continue
          }

          val result = getReader(context).read(img)
          Log.i(
            TAG,
            "ocr complete retry=$attempt aligned=${result.aligned} method=${result.method}",
          )
          if (!result.aligned) {
            throw IllegalStateException("NOT_ALIGNED:${result.method}")
          }
          return result.evidence.toString()
        } catch (t: Throwable) {
          img.release()
          throw t
        }
      }
      throw IllegalStateException("CAPTURE_RETRY_EXHAUSTED")
    } finally {
      capturing = false
      if (stopRequested) ContextCompat.getMainExecutor(context).execute { unbind() }
    }
  }

  private fun decodeEncodedUpright(encoded: ByteArray, fallbackRotationDegrees: Int): Pair<Mat, Int> {
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
    val decoded = Imgcodecs.imdecode(enc, Imgcodecs.IMREAD_COLOR or Imgcodecs.IMREAD_IGNORE_ORIENTATION)
    enc.release()
    if (decoded.empty()) {
      decoded.release()
      throw IllegalStateException("IMAGE_UNREADABLE")
    }
    return Pair(applyOrientation(decoded, exifOrientation, fallbackRotationDegrees), exifOrientation)
  }

  private fun clampMaxSide(src: Mat): Mat {
    val longest = maxOf(src.cols(), src.rows())
    if (longest <= MAX_SIDE) return src
    val scaled = Mat()
    val f = MAX_SIDE.toDouble() / longest
    Imgproc.resize(
      src,
      scaled,
      org.opencv.core.Size(src.cols() * f, src.rows() * f),
      0.0,
      0.0,
      Imgproc.INTER_AREA,
    )
    src.release()
    return scaled
  }

  /**
   * Decodes JPEG/PNG/WebP bytes in native memory, applies exact EXIF orientation (or CameraX
   * `fallbackRotationDegrees` when the Camera2 HAL omits EXIF orientation), zeroes the byte array,
   * and runs `NativeBlankScanner::process_blank`.
   */
  fun readEncoded(context: Context, encoded: ByteArray, fallbackRotationDegrees: Int = 0): String {
    ensureOpenCv()
    val (upright, _) = decodeEncodedUpright(encoded, fallbackRotationDegrees)
    return readMat(context, upright)
  }

  private fun readMat(context: Context, rawImg: Mat): String {
    var img = rawImg
    try {
      img = clampMaxSide(img)
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
    Log.i(
      "OcrNative",
      "Initialized C++20 NativeBlankScanner: model=${modelResolved.file.name}, spec=${specResolved.file.name}",
    )
    val built = SheetReader(bridge)
    reader = built
    return built
  }
}
