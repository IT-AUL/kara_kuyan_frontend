package expo.modules.ocrnative

import org.json.JSONArray
import org.json.JSONObject
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc

/**
 * Reads one worksheet image (BGR, native memory) into structured evidence (v4 pipeline):
 * Rectify -> Locate Grid -> Safe Border Suppression -> Cell Preprocess -> Batched ORT Inference ->
 * Stage 6 Hard Geometric Diacritic Constraint (`Ё`/`Й`) -> QR Decode.
 *
 * Only numbers and text leave this class; all pixel buffers stay in native memory and are freed here (ADR 0003).
 */
class SheetReader(
  private val engine: OrtEngine,
  private val alphabet: List<String>,
  private val modelSha256: String,
) {
  private val pipeline = SheetPipeline()
  private val indexYo = alphabet.indexOf("Ё")
  private val indexYe = alphabet.indexOf("Е")
  private val indexShortI = alphabet.indexOf("Й")
  private val indexO = alphabet.indexOf("О")
  private val indexI = alphabet.indexOf("И")

  class Read(val evidence: JSONObject, val method: String)

  companion object {
    val ALIGNED_METHODS = setOf("aruco-4-point", "marker-homography", "marker-similarity")
  }

  fun read(img: Mat): Read {
    val stages = JSONObject()
    var t = System.nanoTime()
    fun lap(k: String) {
      val n = System.nanoTime()
      stages.put(k, (n - t) / 1e6)
      t = n
    }

    val (rect, method, used) = pipeline.rectify(img)
    lap("rectify")
    if (method !in ALIGNED_METHODS) {
      rect.release()
      return Read(JSONObject().put("method", method).put("markersUsed", used), method)
    }

    val rawGray = Mat()
    Imgproc.cvtColor(rect, rawGray, Imgproc.COLOR_BGR2GRAY)
    val (nameBoxes, rows) = pipeline.locate(rect, rawGray)
    lap("locate")

    val gray = pipeline.suppressGridBorders(rawGray, nameBoxes, rows)
    rawGray.release()
    lap("borderSuppress")

    val size = CellPreprocessor.SIZE * CellPreprocessor.SIZE
    val boxes = nameBoxes + rows.flatMap { it.boxes }
    val tensors = FloatArray(boxes.size * size)
    val filled = ArrayList<Int>()
    val inkOf = HashMap<Int, Int>()
    val diacriticOf = HashMap<Int, Boolean>()

    boxes.forEachIndexed { i, b ->
      val crop = pipeline.cropGray(gray, b)
      val r = CellPreprocessor.preprocess(crop, marginTrimPct = 4)
      crop.release()
      if (!r.isEmpty) {
        CellPreprocessor.toTensor(r.inp64, tensors, filled.size * size)
        filled.add(i)
        inkOf[i] = r.inkPixels
        diacriticOf[i] = r.hasTopDiacritic
      }
    }
    gray.release()
    lap("preprocess")

    val logits = if (filled.isNotEmpty()) engine.infer(tensors, filled.size) else emptyArray()
    lap("infer")

    val probs = HashMap<Int, FloatArray>()
    filled.forEachIndexed { k, i ->
      val p = OrtEngine.softmax(logits[k])
      applyDiacriticConstraint(p, diacriticOf[i] == true)
      probs[i] = p
    }

    var qr = pipeline.qrWithOpenCv(rect)
    if (qr.isEmpty()) {
      qr = try {
        pipeline.qrWithMlKit(rect) ?: ""
      } catch (_: Throwable) {
        ""
      }
    }
    lap("qr")
    rect.release()

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
        JSONObject()
          .put("questionNumber", row.markerId - 10)
          .put("markerId", row.markerId)
          .put("cells", JSONArray().also { a -> row.boxes.indices.forEach { j -> a.put(cellJson(j, cursor + j)) } }),
      )
      cursor += row.boxes.size
    }
    val evidence = JSONObject()
      .put("alphabet", JSONArray(alphabet))
      .put("modelSha256", modelSha256)
      .put("qrPayload", if (qr.isEmpty()) JSONObject.NULL else qr)
      .put("studentNameText", name.toString())
      .put("method", method)
      .put("markersUsed", used)
      .put("questions", questions)
      .put("stageTimingsMs", stages)
    return Read(evidence, method)
  }

  /**
   * Stage 6 (`blank_pipeline.py:733-755`): if Top-1 predicts `Ё` or `Й` on a cell whose ink mask
   * has no detached top diacritic (`area >= 10 px` strictly above main body), deterministically
   * demote `Ё -> Е` and `Й -> О/И` when present in top-3 candidates.
   */
  private fun applyDiacriticConstraint(probs: FloatArray, hasTopDiacritic: Boolean) {
    if (hasTopDiacritic || probs.isEmpty()) return
    val top3 = probs.indices.sortedByDescending { probs[it] }.take(3)
    val best = top3.firstOrNull() ?: return
    val altIdx = when (best) {
      indexYo -> if (indexYe in top3) indexYe else -1
      indexShortI -> when {
        indexO in top3 -> indexO
        indexI in top3 -> indexI
        else -> -1
      }
      else -> -1
    }
    if (altIdx >= 0 && altIdx != best) {
      val tmp = probs[best]
      probs[best] = probs[altIdx]
      probs[altIdx] = tmp
    }
  }
}
