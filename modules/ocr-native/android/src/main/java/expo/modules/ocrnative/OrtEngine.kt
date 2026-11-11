package expo.modules.ocrnative

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.nio.FloatBuffer
import kotlin.math.exp

/**
 * Thin wrapper over ONNX Runtime Android for the 39-class `TatarOCRNetV3_MultiScale` (v4) cell classifier.
 * Input `input` [N,1,64,64] float32, output `output` [N,39] float32.
 *
 * Tuned for heterogeneous Android SoCs:
 * - GraphOptimizationLevel.ALL_OPT + memory pattern optimization
 * - `session.intra_op.allow_spinning = "0"` to prevent battery/thermal throttling and big.LITTLE contention
 * - Thread pool isolated to physical big/Prime cores via [CpuTopology]
 * - Explicit [warmup] to pre-pack XNNPACK multi-scale kernels off the critical capture path
 */
class OrtEngine(
  modelPath: String,
  val lane: Lane,
  val threads: Int = CpuTopology.optimalThreads,
) : AutoCloseable {
  /** XNNPACK for FP32 graph; plain CPU EP for dynamic-INT8 (`ConvInteger`) fallback and benchmarking. */
  enum class Lane { FP32_XNNPACK, CPU }

  private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
  private val session: OrtSession
  private val inputName: String

  init {
    val options = OrtSession.SessionOptions()
    options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
    options.setMemoryPatternOptimization(true)
    options.setExecutionMode(OrtSession.SessionOptions.ExecutionMode.SEQUENTIAL)
    options.addConfigEntry("session.intra_op.allow_spinning", "0")
    when (lane) {
      Lane.FP32_XNNPACK -> {
        options.setIntraOpNumThreads(1)
        options.addXnnpack(mapOf("intra_op_num_threads" to threads.toString()))
      }
      Lane.CPU -> options.setIntraOpNumThreads(threads)
    }
    session = env.createSession(modelPath, options)
    inputName = session.inputNames.firstOrNull() ?: "input"
  }

  /** Pre-packs kernels and initializes arenas so the teacher's first sheet sees warm latency. */
  fun warmup() {
    val dummy = FloatArray(CellPreprocessor.SIZE * CellPreprocessor.SIZE)
    infer(dummy, 1)
  }

  /** [tensors] holds n * 64 * 64 floats. Returns raw logits, one row per cell. */
  fun infer(tensors: FloatArray, n: Int): Array<FloatArray> {
    if (n <= 0) return emptyArray()
    val cellLen = CellPreprocessor.SIZE * CellPreprocessor.SIZE
    val shape = longArrayOf(n.toLong(), 1, CellPreprocessor.SIZE.toLong(), CellPreprocessor.SIZE.toLong())
    val buf = FloatBuffer.wrap(tensors, 0, n * cellLen)
    OnnxTensor.createTensor(env, buf, shape).use { input ->
      session.run(mapOf(inputName to input)).use { result ->
        @Suppress("UNCHECKED_CAST")
        return (result[0].value as Array<FloatArray>).map { it.copyOf() }.toTypedArray()
      }
    }
  }

  override fun close() = session.close()

  companion object {
    fun softmax(logits: FloatArray): FloatArray {
      val m = logits.max()
      val e = FloatArray(logits.size) { exp(logits[it] - m) }
      val s = e.sum()
      return FloatArray(e.size) { e[it] / s }
    }
  }
}
