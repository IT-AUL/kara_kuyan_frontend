package expo.modules.ocrnative

import org.json.JSONArray
import org.json.JSONObject
import org.opencv.core.Mat
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Reads one worksheet image (BGR, native memory) into structured `SheetEvidence`
 * using the canonical C++20 `tatar_ocr::NativeBlankScanner` (`third_party/tatar_ocr/native`)
 * plus native-memory QR decoding (`QrDecoder`).
 *
 * Zero-Photo invariant (ADR 0003): all `cv::Mat` frames and rectified buffers stay strictly in
 * native memory and are freed before returning; only characters, numbers, and bounding boxes cross JNI/JS.
 */
class SheetReader(
  val scanner: NativeBlankScannerBridge,
) {
  class Read(val evidence: JSONObject, val method: String, val aligned: Boolean)

  companion object {
    const val UNALIGNED_METHOD_PREFIX = "Direct Scaling"

    fun isAlignedMethod(method: String): Boolean =
      method.isNotBlank() && !method.startsWith(UNALIGNED_METHOD_PREFIX, ignoreCase = true)
  }

  fun read(imgBgr: Mat): Read {
    val stages = JSONObject()
    val rectified = Mat()
    try {
      val rawJsonStr = scanner.processBlank(imgBgr, rectified)
      val raw = JSONObject(rawJsonStr)
      val method = raw.optString("rectification_method", "")
      val processBlankMs = raw.optDouble("process_blank_ms", 0.0)
      stages.put("processBlank", Math.round(processBlankMs * 100.0) / 100.0)

      val aligned = isAlignedMethod(method)
      if (!aligned) {
        return Read(
          JSONObject()
            .put("method", method)
            .put("stageTimingsMs", stages),
          method,
          false,
        )
      }

      val qrStart = System.nanoTime()
      val qr = QrDecoder.decode(rectified, imgBgr)
      val qrMs = (System.nanoTime() - qrStart) / 1e6
      stages.put("qr", Math.round(qrMs * 100.0) / 100.0)

      val alphabetArr = raw.optJSONArray("alphabet") ?: JSONArray()
      val alphabet = List(alphabetArr.length()) { alphabetArr.getString(it) }
      val alphaIndex = HashMap<String, Int>(alphabet.size * 2).also { map ->
        alphabet.forEachIndexed { idx, ch -> map[ch] = idx }
      }

      fun mapCell(cellObj: JSONObject, zeroBasedIdx: Int): JSONObject {
        val isEmpty = cellObj.optBoolean("is_empty", true)
        val ch = cellObj.optString("char", " ")
        val confPct = cellObj.optDouble("confidence", if (isEmpty) 100.0 else 0.0)
        val conf01 = if (isEmpty) 1.0 else (confPct / 100.0).coerceIn(0.0, 1.0)
        val bboxArr = cellObj.optJSONArray("bbox") ?: JSONArray()

        val top3Out = JSONArray()
        val probs = DoubleArray(alphabet.size)
        if (!isEmpty) {
          val rawTop3 = cellObj.optJSONArray("top3") ?: JSONArray()
          var sumAssigned = 0.0
          for (k in 0 until rawTop3.length()) {
            val item = rawTop3.getJSONObject(k)
            val tch = item.optString("char", "")
            val tconf01 = (item.optDouble("confidence", 0.0) / 100.0).coerceIn(0.0, 1.0)
            if (tch.isNotBlank()) {
              top3Out.put(
                JSONObject()
                  .put("char", tch)
                  .put("confidence", Math.round(tconf01 * 10000.0) / 10000.0),
              )
              val aIdx = alphaIndex[tch]
              if (aIdx != null && probs[aIdx] == 0.0) {
                probs[aIdx] = tconf01
                sumAssigned += tconf01
              }
            }
          }
          // Ensure Stage-6 diacritic-guarded top-1 remains argmax even for legacy probability consumers
          val top1Idx = alphaIndex[ch]
          if (top1Idx != null) {
            val maxOther = probs.indices.filter { it != top1Idx }.maxOfOrNull { probs[it] } ?: 0.0
            if (probs[top1Idx] <= maxOther) {
              probs[top1Idx] = max(conf01, (maxOther + 0.0001).coerceAtMost(1.0))
            }
          }
          val remainingCount = probs.count { it == 0.0 }
          if (remainingCount > 0 && sumAssigned < 1.0) {
            val share = (1.0 - sumAssigned).coerceAtLeast(0.0) / remainingCount
            for (i in probs.indices) {
              if (probs[i] == 0.0) probs[i] = share
            }
          }
        }

        val probsJson = JSONArray()
        if (!isEmpty) {
          for (p in probs) {
            probsJson.put(Math.round(p * 100000.0) / 100000.0)
          }
        }

        return JSONObject()
          .put("index", zeroBasedIdx)
          .put("cellIdx", cellObj.optInt("cell_idx", zeroBasedIdx + 1))
          .put("isEmpty", isEmpty)
          .put("char", if (isEmpty) " " else ch)
          .put("confidence", Math.round(conf01 * 10000.0) / 10000.0)
          .put("top3", top3Out)
          .put("bbox", bboxArr)
          .put("probabilities", probsJson)
      }

      val nameCellsIn = raw.optJSONArray("student_name_cells") ?: JSONArray()
      val nameCellsOut = JSONArray()
      for (i in 0 until nameCellsIn.length()) {
        nameCellsOut.put(mapCell(nameCellsIn.getJSONObject(i), i))
      }

      val questionsIn = raw.optJSONArray("questions") ?: JSONArray()
      val questionsOut = JSONArray()
      for (qi in 0 until questionsIn.length()) {
        val q = questionsIn.getJSONObject(qi)
        val qNum = q.getInt("q_num")
        val markerId = q.optInt("marker_id", 10 + qNum)
        val qCellsIn = q.optJSONArray("cells") ?: JSONArray()
        val qCellsOut = JSONArray()
        for (ci in 0 until qCellsIn.length()) {
          qCellsOut.put(mapCell(qCellsIn.getJSONObject(ci), ci))
        }
        questionsOut.put(
          JSONObject()
            .put("questionNumber", qNum)
            .put("markerId", markerId)
            .put("text", q.optString("text", ""))
            .put("cells", qCellsOut),
        )
      }

      val rawStats = raw.optJSONObject("stats") ?: JSONObject()
      val statsOut = JSONObject()
        .put("totalLetters", rawStats.optInt("total_letters", 0))
        .put("avgConfidence", rawStats.optDouble("avg_confidence", 0.0))
        .put("questionsCount", rawStats.optInt("questions_count", questionsOut.length()))

      val evidence = JSONObject()
        .put("alphabet", alphabetArr)
        .put("modelSha256", scanner.modelSha256)
        .put("qrPayload", if (qr.isEmpty()) JSONObject.NULL else qr)
        .put("studentNameText", raw.optString("student_name", ""))
        .put("studentNameCells", nameCellsOut)
        .put("method", method)
        .put("stats", statsOut)
        .put("questions", questionsOut)
        .put("stageTimingsMs", stages)

      return Read(evidence, method, true)
    } finally {
      rectified.release()
    }
  }
}
