package expo.modules.ocrnative

import android.Manifest
import android.app.Activity
import android.content.Intent
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject
import org.opencv.android.OpenCVLoader
import org.opencv.core.Core
import org.opencv.imgcodecs.Imgcodecs
import java.io.File
import kotlin.math.abs

class OcrNativeModule : Module() {
  private var pendingPick: Promise? = null

  private companion object {
    const val PICK_REQUEST = 7311
    const val FP32_MODEL = "tatar_ocr_v4_handwritten39_fp32.onnx"
    const val INT8_MODEL = "tatar_ocr_v4_handwritten39_int8.onnx"
  }

  override fun definition() = ModuleDefinition {
    Name("OcrNative")

    AsyncFunction("info") {
      val cvOk = OpenCVLoader.initLocal()
      val ctx = appContext.reactContext
      val scannerOk = if (ctx != null) {
        try {
          CameraController.getReader(ctx)
          true
        } catch (_: Throwable) {
          false
        }
      } else {
        false
      }
      JSONObject()
        .put("opencvLoaded", cvOk)
        .put("opencvVersion", if (cvOk) Core.VERSION else JSONObject.NULL)
        .put("engine", "tatar_ocr_core_cpp20")
        .put("scannerReady", scannerOk)
        .put("modelFile", INT8_MODEL)
        .put("specFile", "pipeline_spec.json")
        .put("abi", android.os.Build.SUPPORTED_ABIS.firstOrNull())
        .put("optimalThreads", CpuTopology.optimalThreads)
        .put("filesDir", ctx?.filesDir?.absolutePath ?: JSONObject.NULL)
        .toString()
    }

    View(OcrCameraView::class) {
      Events("onAlignment")
      Prop("active") { view: OcrCameraView, active: Boolean -> view.setActive(active) }
    }

    AsyncFunction("requestCameraPermission") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.CAMERA)
    }

    AsyncFunction("getCameraPermission") { promise: Promise ->
      Permissions.getPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.CAMERA)
    }

    AsyncFunction("captureSheet") {
      CameraController.capture(appContext.reactContext ?: throw IllegalStateException("no context"))
    }

    AsyncFunction("pickAndReadSheet") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "no foreground activity", null)
        return@AsyncFunction
      }
      pendingPick?.reject("PICK_SUPERSEDED", "another pick started", null)
      pendingPick = promise
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "image/*"
      }
      activity.startActivityForResult(intent, PICK_REQUEST)
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != PICK_REQUEST) return@OnActivityResult
      val promise = pendingPick ?: return@OnActivityResult
      pendingPick = null
      val uri = payload.data?.data
      if (payload.resultCode != Activity.RESULT_OK || uri == null) {
        promise.reject("PICK_CANCELLED", "no file chosen", null)
        return@OnActivityResult
      }
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("NO_CONTEXT", "no context", null)
        return@OnActivityResult
      }
      Thread {
        try {
          val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw IllegalStateException("IMAGE_UNREADABLE")
          promise.resolve(CameraController.readEncoded(context, bytes))
        } catch (e: Throwable) {
          promise.reject("READ_FAILED", e.message ?: e.toString(), e)
        }
      }.start()
    }

    // Dev-only full C++20 NativeBlankScanner benchmark on <filesDir>/ocr-lab/sheets (plus rotated EXIF check).
    AsyncFunction("sheetTest") { runs: Int, promise: Promise ->
      val ctx = appContext.reactContext
      if (ctx == null) {
        promise.reject("NO_CONTEXT", "no context", null)
        return@AsyncFunction
      }
      Thread {
        try {
          val root = File(ctx.filesDir, "ocr-lab")
          promise.resolve(runSheetTest(ctx, root, runs))
        } catch (e: Throwable) {
          promise.reject("SHEET_TEST_FAILED", e.message ?: e.toString(), e)
        }
      }.start()
    }

    // Dev-only helper to exercise CameraController.readEncoded (EXIF orientation + C++ NativeBlankScanner) on a test file.
    AsyncFunction("readFileForDev") { relativePath: String, fallbackRotationDegrees: Int, promise: Promise ->
      val ctx = appContext.reactContext
      if (ctx == null) {
        promise.reject("NO_CONTEXT", "no context", null)
        return@AsyncFunction
      }
      Thread {
        try {
          val file = File(ctx.filesDir, relativePath)
          val bytes = file.readBytes()
          promise.resolve(CameraController.readEncoded(ctx, bytes, fallbackRotationDegrees))
        } catch (e: Throwable) {
          promise.reject("READ_FILE_DEV_FAILED", e.message ?: e.toString(), e)
        }
      }.start()
    }

    AsyncFunction("benchmark") { cells: Int, runs: Int, promise: Promise ->
      val ctx = appContext.reactContext
      if (ctx == null) {
        promise.reject("NO_CONTEXT", "no files dir", null)
        return@AsyncFunction
      }
      Thread {
        try {
          val root = File(ctx.filesDir, "ocr-lab")
          promise.resolve(runBenchmark(File(root, "fixtures"), File(root, "models"), cells, runs))
        } catch (e: Throwable) {
          promise.reject("BENCH_FAILED", e.message ?: e.toString(), e)
        }
      }.start()
    }

    AsyncFunction("selfTest") { promise: Promise ->
      val ctx = appContext.reactContext
      if (ctx == null) {
        promise.reject("NO_CONTEXT", "no files dir", null)
        return@AsyncFunction
      }
      Thread {
        try {
          val root = File(ctx.filesDir, "ocr-lab")
          promise.resolve(runSelfTest(File(root, "fixtures"), File(root, "models")))
        } catch (e: Throwable) {
          promise.reject("SELFTEST_FAILED", e.message ?: e.toString(), e)
        }
      }.start()
    }
  }

  private fun runSelfTest(fixtures: File, models: File): String {
    val report = JSONObject()
    if (!OpenCVLoader.initLocal()) return report.put("error", "OpenCV failed to load").toString()

    val golden = JSONObject(File(fixtures, "golden.json").readText())
    val files = golden.getJSONArray("files")
    val labels = golden.getJSONArray("labels")
    val n = files.length()
    val goldenInp = File(fixtures, "golden_inp64.bin").readBytes()
    val size = CellPreprocessor.SIZE * CellPreprocessor.SIZE

    val tensors = FloatArray(n * size)
    var exact = 0
    var maxDiff = 0
    var diffPixels = 0L
    val t0 = System.nanoTime()
    for (i in 0 until n) {
      val bgr = Imgcodecs.imread(File(fixtures, "cells/${files.getString(i)}").absolutePath)
      val gray = CellPreprocessor.grayOf(bgr)
      bgr.release()
      val r = CellPreprocessor.preprocess(gray)
      gray.release()
      var cellMax = 0
      for (j in 0 until size) {
        val d = abs((r.inp64[j].toInt() and 0xFF) - (goldenInp[i * size + j].toInt() and 0xFF))
        if (d > 0) diffPixels++
        if (d > cellMax) cellMax = d
      }
      if (cellMax == 0) exact++
      if (cellMax > maxDiff) maxDiff = dMax(maxDiff, cellMax)
      CellPreprocessor.toTensor(r.inp64, tensors, i * size)
    }
    val preprocessMs = (System.nanoTime() - t0) / 1e6
    report.put(
      "preprocess",
      JSONObject().put("cells", n).put("exactCells", exact).put("maxPixelDiff", maxDiff)
        .put("differingPixels", diffPixels).put("totalMs", preprocessMs),
    )

    val lanes = JSONArray()
    for ((name, lane, key) in listOf(
      Triple(FP32_MODEL, OrtEngine.Lane.FP32_XNNPACK, "logits_fp32"),
      Triple(INT8_MODEL, OrtEngine.Lane.CPU, "logits_int8"),
    )) {
      val model = File(models, name)
      val entry = JSONObject().put("model", name)
      if (!model.exists()) {
        lanes.put(entry.put("error", "missing"))
        continue
      }
      try {
        OrtEngine(model.absolutePath, lane).use { engine ->
          val t1 = System.nanoTime()
          val logits = engine.infer(tensors, n)
          val ms = (System.nanoTime() - t1) / 1e6
          var labelOk = 0
          for (i in 0 until n) {
            var best = 0
            for (k in logits[i].indices) if (logits[i][k] > logits[i][best]) best = k
            if (best == labels.getInt(i)) labelOk++
          }
          if (golden.has(key)) {
            val goldenLogits = golden.getJSONArray(key)
            var maxLogitDiff = 0.0
            var argmaxOk = 0
            for (i in 0 until n) {
              val g = goldenLogits.getJSONArray(i)
              val best = logits[i].indices.maxByOrNull { logits[i][it] } ?: 0
              var goldenBest = 0
              for (k in 0 until g.length()) {
                maxLogitDiff = maxOf(maxLogitDiff, abs(logits[i][k] - g.getDouble(k)))
                if (g.getDouble(k) > g.getDouble(goldenBest)) goldenBest = k
              }
              if (best == goldenBest) argmaxOk++
            }
            entry.put("maxLogitDiffVsGolden", maxLogitDiff).put("argmaxMatchesGolden", argmaxOk)
          }
          entry.put("argmaxMatchesLabel", labelOk).put("batchOfCellsMs", ms)
        }
      } catch (e: Throwable) {
        entry.put("error", e.toString())
      }
      lanes.put(entry)
    }
    report.put("lanes", lanes)
    return report.toString()
  }

  private fun dMax(a: Int, b: Int) = if (a >= b) a else b

  private fun stats(ms: List<Double>): JSONObject {
    val sorted = ms.sorted()
    fun pct(q: Double) = sorted[minOf(sorted.size - 1, kotlin.math.ceil(q / 100.0 * sorted.size).toInt() - 1).coerceAtLeast(0)]
    return JSONObject().put("runs", ms.size).put("median", pct(50.0)).put("p95", pct(95.0))
      .put("min", sorted.first()).put("max", sorted.last()).put("mean", ms.average())
  }

  private fun runBenchmark(fixtures: File, models: File, cells: Int, runs: Int): String {
    val report = JSONObject()
    if (!OpenCVLoader.initLocal()) return report.put("error", "OpenCV failed to load").toString()
    val files = JSONObject(File(fixtures, "golden.json").readText()).getJSONArray("files")
    val size = CellPreprocessor.SIZE * CellPreprocessor.SIZE

    val grays = (0 until cells).map { i ->
      val bgr = Imgcodecs.imread(File(fixtures, "cells/${files.getString(i % files.length())}").absolutePath)
      CellPreprocessor.grayOf(bgr).also { bgr.release() }
    }
    val tensors = FloatArray(cells * size)
    val preColdStart = System.nanoTime()
    grays.forEachIndexed { i, g -> CellPreprocessor.toTensor(CellPreprocessor.preprocess(g).inp64, tensors, i * size) }
    val preCold = (System.nanoTime() - preColdStart) / 1e6
    val preWarm = (0 until runs).map {
      val t = System.nanoTime()
      grays.forEachIndexed { i, g -> CellPreprocessor.toTensor(CellPreprocessor.preprocess(g).inp64, tensors, i * size) }
      (System.nanoTime() - t) / 1e6
    }
    report.put("cells", cells).put("runs", runs)
      .put("optimalThreads", CpuTopology.optimalThreads)
      .put("preprocess", JSONObject().put("coldMsForAllCells", preCold).put("warmMsForAllCells", stats(preWarm)))

    val configs = JSONArray()
    val lanes = listOf(
      Triple(FP32_MODEL, OrtEngine.Lane.FP32_XNNPACK, "v4-fp32+xnnpack"),
      Triple(FP32_MODEL, OrtEngine.Lane.CPU, "v4-fp32+cpu"),
      Triple(INT8_MODEL, OrtEngine.Lane.CPU, "v4-int8+cpu"),
    )
    for ((file, lane, label) in lanes) for (threads in listOf(1, 2, 4)) {
      val entry = JSONObject().put("lane", label).put("threads", threads)
      try {
        val t0 = System.nanoTime()
        OrtEngine(File(models, file).absolutePath, lane, threads).use { engine ->
          entry.put("createSessionMs", (System.nanoTime() - t0) / 1e6)
          val t1 = System.nanoTime()
          engine.infer(tensors, cells)
          entry.put("firstRunMs", (System.nanoTime() - t1) / 1e6)
          val warm = (0 until runs).map {
            val t = System.nanoTime()
            engine.infer(tensors, cells)
            (System.nanoTime() - t) / 1e6
          }
          entry.put("warmMs", stats(warm))
        }
      } catch (e: Throwable) {
        entry.put("error", e.toString())
      }
      configs.put(entry)
    }
    report.put("configs", configs)
    grays.forEach { it.release() }
    return report.toString()
  }

  private fun median(v: List<Double>) = v.sorted().let { it[it.size / 2] }

  private fun runSheetTest(context: android.content.Context, root: File, runs: Int): String {
    val report = JSONObject().put("engine", "tatar_ocr_core_cpp20")
    if (!OpenCVLoader.initLocal()) return report.put("error", "OpenCV failed to load").toString()
    val images = File(root, "sheets").listFiles { f -> f.extension.lowercase() in setOf("jpg", "jpeg", "png") }?.sortedBy { it.name }
      ?: return report.put("error", "no sheets dir").toString()
    val results = JSONArray()

    for (file in images) {
      val entry = JSONObject().put("file", file.name)
      val totals = ArrayList<Double>()
      try {
        for (run in 0 until runs.coerceAtLeast(1)) {
          val t0 = System.nanoTime()
          val evStr = CameraController.readEncoded(context, file.readBytes())
          totals.add((System.nanoTime() - t0) / 1e6)
          if (run == 0) {
            val ev = JSONObject(evStr)
            val rowsOut = JSONArray()
            val qs = ev.optJSONArray("questions") ?: JSONArray()
            for (qi in 0 until qs.length()) {
              val q = qs.getJSONObject(qi)
              val cells = q.getJSONArray("cells")
              val cellItems = JSONArray()
              for (ci in 0 until cells.length()) {
                val c = cells.getJSONObject(ci)
                val empty = c.getBoolean("isEmpty")
                if (empty) {
                  cellItems.put(
                    JSONObject()
                      .put("idx", ci + 1)
                      .put("char", "")
                      .put("conf", 100.0)
                      .put("empty", true)
                      .put("bbox", c.optJSONArray("bbox")),
                  )
                } else {
                  val ch = c.optString("char", "?")
                  val conf = Math.round(c.optDouble("confidence", 0.0) * 1000.0) / 10.0
                  val t3In = c.optJSONArray("top3") ?: JSONArray()
                  val top3 = JSONArray()
                  for (k in 0 until t3In.length()) {
                    val item = t3In.getJSONObject(k)
                    top3.put(
                      JSONObject()
                        .put("char", item.optString("char", "?"))
                        .put("conf", Math.round(item.optDouble("confidence", 0.0) * 1000.0) / 10.0),
                    )
                  }
                  cellItems.put(
                    JSONObject()
                      .put("idx", ci + 1)
                      .put("char", ch)
                      .put("conf", conf)
                      .put("empty", false)
                      .put("top3", top3)
                      .put("bbox", c.optJSONArray("bbox")),
                  )
                }
              }
              rowsOut.put(
                JSONObject()
                  .put("q_num", q.getInt("questionNumber"))
                  .put("marker", q.getInt("markerId"))
                  .put("text", q.optString("text", ""))
                  .put("cells", cellItems),
              )
            }
            entry.put("method", ev.optString("method"))
              .put("name", ev.optString("studentNameText"))
              .put("qr", ev.opt("qrPayload"))
              .put("stats", ev.optJSONObject("stats"))
              .put("stageTimingsMs", ev.optJSONObject("stageTimingsMs"))
              .put("rows", rowsOut)
          }
        }
        entry.put("coldTotalMs", totals.first())
        if (totals.size > 1) entry.put("warmMedianMs", median(totals.drop(1)))
      } catch (e: Throwable) {
        entry.put("error", e.toString())
      }
      results.put(entry)
    }
    return report.put("runs", runs).put("sheets", results).toString()
  }
}
