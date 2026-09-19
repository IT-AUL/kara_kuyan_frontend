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
import org.opencv.imgproc.Imgproc
import org.opencv.core.Mat
import java.io.File
import kotlin.math.abs

class OcrNativeModule : Module() {
  private var pendingPick: Promise? = null

  private companion object { const val PICK_REQUEST = 7311 }

  override fun definition() = ModuleDefinition {
    Name("OcrNative")

    AsyncFunction("info") {
      val cvOk = OpenCVLoader.initLocal()
      JSONObject()
        .put("opencvLoaded", cvOk)
        .put("opencvVersion", if (cvOk) Core.VERSION else JSONObject.NULL)
        .put("abi", android.os.Build.SUPPORTED_ABIS.firstOrNull())
        .put("filesDir", appContext.reactContext?.filesDir?.absolutePath ?: JSONObject.NULL)
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

    // Captures a still in memory, reads it, returns structured evidence (numbers and text only).
    AsyncFunction("captureSheet") {
      CameraController.capture(appContext.reactContext ?: throw IllegalStateException("no context"))
    }

    // Lets the teacher pick an existing image of a sheet (system picker, no storage permission). The file is read
    // straight into native memory, processed and released: never copied, cached, or shown to JS (ADR 0007).
    AsyncFunction("pickAndReadSheet") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) { promise.reject("NO_ACTIVITY", "no foreground activity", null); return@AsyncFunction }
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
      if (context == null) { promise.reject("NO_CONTEXT", "no context", null); return@OnActivityResult }
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

    // Dev-only sheet pipeline test (spike task 10): still images from <filesDir>/ocr-lab/sheets.
    AsyncFunction("sheetTest") { runs: Int ->
      val root = File(appContext.reactContext?.filesDir ?: throw IllegalStateException("no files dir"), "ocr-lab")
      runSheetTest(root, runs)
    }

    // Dev-only benchmark (spike task 9): full-sheet batch, thread sweep, first run vs warm runs.
    AsyncFunction("benchmark") { cells: Int, runs: Int ->
      val root = File(appContext.reactContext?.filesDir ?: throw IllegalStateException("no files dir"), "ocr-lab")
      runBenchmark(File(root, "fixtures"), File(root, "models"), cells, runs)
    }

    // Dev-only parity self-test (spike tasks 7-8). Fixtures and models are pushed to
    // <filesDir>/ocr-lab/{fixtures,models} with `adb` + `run-as`; nothing is bundled in the app.
    AsyncFunction("selfTest") {
      val root = File(appContext.reactContext?.filesDir ?: throw IllegalStateException("no files dir"), "ocr-lab")
      runSelfTest(File(root, "fixtures"), File(root, "models"))
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
      if (cellMax > maxDiff) maxDiff = cellMax
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
      Triple("tatar_ocr_uppercase39_fp32.onnx", OrtEngine.Lane.FP32_XNNPACK, "logits_fp32"),
      Triple("tatar_ocr_uppercase39_int8.onnx", OrtEngine.Lane.CPU, "logits_int8"),
    )) {
      val model = File(models, name)
      val entry = JSONObject().put("model", name)
      if (!model.exists()) { lanes.put(entry.put("error", "missing")); continue }
      try {
        OrtEngine(model.absolutePath, lane).use { engine ->
          val t1 = System.nanoTime()
          val logits = engine.infer(tensors, n)
          val ms = (System.nanoTime() - t1) / 1e6
          val goldenLogits = golden.getJSONArray(key)
          var maxLogitDiff = 0.0
          var argmaxOk = 0
          var labelOk = 0
          for (i in 0 until n) {
            val g = goldenLogits.getJSONArray(i)
            var best = 0
            for (k in logits[i].indices) {
              maxLogitDiff = maxOf(maxLogitDiff, abs(logits[i][k] - g.getDouble(k)))
              if (logits[i][k] > logits[i][best]) best = k
            }
            var goldenBest = 0
            for (k in 0 until g.length()) if (g.getDouble(k) > g.getDouble(goldenBest)) goldenBest = k
            if (best == goldenBest) argmaxOk++
            if (best == labels.getInt(i)) labelOk++
          }
          entry.put("maxLogitDiffVsGolden", maxLogitDiff).put("argmaxMatchesGolden", argmaxOk)
            .put("argmaxMatchesLabel", labelOk).put("batchOfCellsMs", ms)
        }
      } catch (e: Throwable) {
        entry.put("error", e.toString())
      }
      lanes.put(entry)
    }
    report.put("lanes", lanes)
    return report.toString()
  }

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
      .put("preprocess", JSONObject().put("coldMsForAllCells", preCold).put("warmMsForAllCells", stats(preWarm)))

    val configs = JSONArray()
    val lanes = listOf(
      Triple("tatar_ocr_uppercase39_fp32.onnx", OrtEngine.Lane.FP32_XNNPACK, "fp32+xnnpack"),
      Triple("tatar_ocr_uppercase39_fp32.onnx", OrtEngine.Lane.CPU, "fp32+cpu"),
      Triple("tatar_ocr_uppercase39_int8.onnx", OrtEngine.Lane.CPU, "int8+cpu"),
    )
    for ((file, lane, label) in lanes) for (threads in listOf(1, 2, 4, 6, 8)) {
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

  private fun runSheetTest(root: File, runs: Int): String {
    val report = JSONObject()
    if (!OpenCVLoader.initLocal()) return report.put("error", "OpenCV failed to load").toString()
    val alphabet = JSONObject(File(root, "fixtures/golden.json").readText()).getJSONArray("alphabet")
      .let { a -> List(a.length()) { a.getString(it) } }
    val images = File(root, "sheets").listFiles { f -> f.extension in setOf("jpg", "jpeg", "png") }?.sortedBy { it.name }
      ?: return report.put("error", "no sheets dir").toString()
    val pipeline = SheetPipeline()
    val results = JSONArray()
    OrtEngine(File(root, "models/tatar_ocr_uppercase39_fp32.onnx").absolutePath, OrtEngine.Lane.FP32_XNNPACK, 6).use { engine ->
      for (file in images) {
        val entry = JSONObject().put("file", file.name)
        val perRun = HashMap<String, MutableList<Double>>()
        fun rec(k: String, ms: Double) { perRun.getOrPut(k) { ArrayList() }.add(ms) }
        try {
          for (run in 0 until runs) {
            val tAll = System.nanoTime()
            var t = System.nanoTime()
            fun lap(k: String) { val n = System.nanoTime(); rec(k, (n - t) / 1e6); t = n }

            val img = Imgcodecs.imread(file.absolutePath); lap("decode")
            val (rect, method, used) = pipeline.rectify(img); lap("rectify")
            img.release()
            val gray = Mat(); Imgproc.cvtColor(rect, gray, Imgproc.COLOR_BGR2GRAY)
            val (nameBoxes, rows) = pipeline.locate(rect, gray); lap("locate")

            val boxes = nameBoxes + rows.flatMap { it.boxes }
            val tensors = FloatArray(boxes.size * CellPreprocessor.SIZE * CellPreprocessor.SIZE)
            val filled = ArrayList<Int>()
            boxes.forEachIndexed { i, b ->
              val r = CellPreprocessor.preprocess(pipeline.cropGray(gray, b), tolerantLines = true)
              if (!r.isEmpty) { CellPreprocessor.toTensor(r.inp64, tensors, filled.size * CellPreprocessor.SIZE * CellPreprocessor.SIZE); filled.add(i) }
            }
            lap("preprocess")
            val logits = if (filled.isNotEmpty()) engine.infer(tensors.copyOf(filled.size * CellPreprocessor.SIZE * CellPreprocessor.SIZE), filled.size) else emptyArray()
            lap("infer")
            val chars = arrayOfNulls<String>(boxes.size)
            filled.forEachIndexed { k, i -> chars[i] = alphabet[logits[k].indices.maxByOrNull { logits[k][it] }!!] }
            val qrCv = pipeline.qrWithOpenCv(rect); lap("qrOpenCv")
            val qrMl = try { pipeline.qrWithMlKit(rect) } catch (e: Throwable) { "error: $e" }; lap("qrMlKit")
            rec("total", (System.nanoTime() - tAll) / 1e6)

            if (run == 0) {
              var idx = nameBoxes.size
              entry.put("method", method).put("markersUsed", used)
                .put("name", nameBoxes.indices.joinToString("") { chars[it] ?: "" })
                .put("rows", JSONArray().also { arr ->
                  for (row in rows) {
                    arr.put(JSONObject().put("marker", row.markerId).put("cells", row.boxes.size)
                      .put("text", row.boxes.indices.joinToString("") { chars[idx + it] ?: "" }))
                    idx += row.boxes.size
                  }
                })
                .put("qrOpenCv", qrCv).put("qrMlKit", qrMl)
            }
            gray.release(); rect.release()
          }
          val stages = JSONObject()
          for ((k, v) in perRun) {
            stages.put(k, JSONObject().put("coldMs", v[0]).put("warmMedianMs", if (v.size > 1) median(v.drop(1)) else JSONObject.NULL))
          }
          entry.put("stages", stages)
        } catch (e: Throwable) {
          entry.put("error", e.toString())
        }
        results.put(entry)
      }
    }
    return report.put("runs", runs).put("sheets", results).toString()
  }
}
