package expo.modules.ocrnative

import org.json.JSONArray
import org.json.JSONObject
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc

/**
 * Reads one worksheet image (BGR, native memory) into structured evidence. Only numbers and text
 * leave this class; the image and every crop stay in native memory and are released here.
 */
class SheetReader(
  private val engine: OrtEngine,
  private val alphabet: List<String>,
  private val modelSha256: String,
) {
  private val pipeline = SheetPipeline()

  class Read(val evidence: JSONObject, val method: String)

  fun read(img: Mat): Read {
    val stages = JSONObject()
    var t = System.nanoTime()
    fun lap(k: String) { val n = System.nanoTime(); stages.put(k, (n - t) / 1e6); t = n }

    val (rect, method, used) = pipeline.rectify(img); lap("rectify")
    if (method != "aruco-4-point" && method != "marker-homography") {
      rect.release()
      return Read(JSONObject().put("method", method).put("markersUsed", used), method)
    }
    val gray = Mat(); Imgproc.cvtColor(rect, gray, Imgproc.COLOR_BGR2GRAY)
    val (nameBoxes, rows) = pipeline.locate(rect, gray); lap("locate")

    val size = CellPreprocessor.SIZE * CellPreprocessor.SIZE
    val boxes = nameBoxes + rows.flatMap { it.boxes }
    val tensors = FloatArray(boxes.size * size)
    val filled = ArrayList<Int>()
    val inkOf = HashMap<Int, Int>()
    boxes.forEachIndexed { i, b ->
      val crop = pipeline.cropGray(gray, b)
      val r = CellPreprocessor.preprocess(crop, tolerantLines = true)
      if (!r.isEmpty) { CellPreprocessor.toTensor(r.inp64, tensors, filled.size * size); filled.add(i); inkOf[i] = r.inkPixels }
    }
    lap("preprocess")
    val logits = if (filled.isNotEmpty()) engine.infer(tensors.copyOf(filled.size * size), filled.size) else emptyArray()
    lap("infer")
    val probs = HashMap<Int, FloatArray>()
    filled.forEachIndexed { k, i -> probs[i] = OrtEngine.softmax(logits[k]) }

    var qr = pipeline.qrWithOpenCv(rect)
    if (qr.isEmpty()) qr = try { pipeline.qrWithMlKit(rect) ?: "" } catch (e: Throwable) { "" }
    lap("qr")
    gray.release(); rect.release()

    fun cellJson(index: Int, boxIndex: Int) = JSONObject().put("index", index).also { o ->
      val p = probs[boxIndex]
      o.put("isEmpty", p == null)
      o.put("inkPixels", inkOf[boxIndex] ?: 0)
      o.put("probabilities", JSONArray().also { a -> p?.forEach { a.put(Math.round(it * 100000.0) / 100000.0) } })
    }

    val name = StringBuilder()
    nameBoxes.indices.forEach { i ->
      val p = probs[i]
      if (p != null) name.append(alphabet[p.indices.maxByOrNull { p[it] }!!])
    }
    var cursor = nameBoxes.size
    val questions = JSONArray()
    for (row in rows) {
      questions.put(
        JSONObject().put("questionNumber", row.markerId - 10).put("markerId", row.markerId)
          .put("cells", JSONArray().also { a -> row.boxes.indices.forEach { j -> a.put(cellJson(j, cursor + j)) } }),
      )
      cursor += row.boxes.size
    }
    val evidence = JSONObject()
      .put("alphabet", JSONArray(alphabet)).put("modelSha256", modelSha256)
      .put("qrPayload", if (qr.isEmpty()) JSONObject.NULL else qr)
      .put("studentNameText", name.toString())
      .put("method", method).put("markersUsed", used)
      .put("questions", questions).put("stageTimingsMs", stages)
    return Read(evidence, method)
  }
}
