package expo.modules.ocrnative

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.nio.FloatBuffer
import kotlin.math.exp

/**
 * Thin wrapper over ONNX Runtime Android for the 39-class cell classifier.
 * Input `input` [N,1,64,64] float32, output `logits` [N,39] float32 (verified on both artifacts).
 */
class OrtEngine(modelPath: String, private val lane: Lane, private val threads: Int = PHYSICAL_THREADS) : AutoCloseable {
  /** XNNPACK for the FP32 graph; plain CPU EP for FP32 baseline and for the dynamic-INT8 graph (XNNPACK cannot run ConvInteger). */
  enum class Lane { FP32_XNNPACK, CPU }

  private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
  private val session: OrtSession

  init {
    val options = OrtSession.SessionOptions()
    options.addConfigEntry("session.intra_op.allow_spinning", "0")
    when (lane) {
      Lane.FP32_XNNPACK -> {
        options.setIntraOpNumThreads(1)
        options.addXnnpack(mapOf("intra_op_num_threads" to threads.toString()))
      }
      Lane.CPU -> options.setIntraOpNumThreads(threads)
    }
    session = env.createSession(modelPath, options)
  }

  /** [tensors] holds n * 64 * 64 floats. Returns raw logits, one row per cell. */
  fun infer(tensors: FloatArray, n: Int): Array<FloatArray> {
    val shape = longArrayOf(n.toLong(), 1, CellPreprocessor.SIZE.toLong(), CellPreprocessor.SIZE.toLong())
    OnnxTensor.createTensor(env, FloatBuffer.wrap(tensors), shape).use { input ->
      session.run(mapOf("input" to input)).use { result ->
        @Suppress("UNCHECKED_CAST")
        return (result[0].value as Array<FloatArray>).map { it.copyOf() }.toTypedArray()
      }
    }
  }

  override fun close() = session.close()

  companion object {
    /** Big cores on SM8650 (1 prime + 5 performance + 2 efficiency); tune during the benchmark task. */
    const val PHYSICAL_THREADS = 4

    fun softmax(logits: FloatArray): FloatArray {
      val m = logits.max()
      val e = FloatArray(logits.size) { exp(logits[it] - m) }
      val s = e.sum()
      return FloatArray(e.size) { e[it] / s }
    }
  }
}
