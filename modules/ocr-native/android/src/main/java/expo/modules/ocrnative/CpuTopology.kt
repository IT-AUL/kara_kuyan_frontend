package expo.modules.ocrnative

import java.io.File

/**
 * Inspects Android Linux cpufreq sysfs to size inference thread pools strictly to physical
 * Prime / Performance ('big') cores on heterogeneous ARM big.LITTLE SoCs.
 *
 * Spawning threads across slow Cortex-A5xx efficiency ('LITTLE') cores causes barrier stalls
 * that hurt p95 latency on budget 2+6 and mid-range 4+4 phones.
 */
object CpuTopology {
  const val MIN_THREADS = 2
  const val MAX_THREADS = 4

  val optimalThreads: Int by lazy { detectOptimalThreads() }

  private fun detectOptimalThreads(): Int {
    try {
      val cpuDir = File("/sys/devices/system/cpu")
      val coreDirs = cpuDir.listFiles { f -> f.isDirectory && f.name.matches(Regex("^cpu\\d+$")) }
      if (!coreDirs.isNullOrEmpty()) {
        val maxFreqs = coreDirs.mapNotNull { dir ->
          val freqFile = File(dir, "cpufreq/cpuinfo_max_freq")
          if (freqFile.canRead()) freqFile.readText().trim().toLongOrNull() else null
        }.filter { it > 0L }

        if (maxFreqs.size >= 2) {
          val highest = maxFreqs.max()
          val lowest = maxFreqs.min()
          // Heterogeneous big.LITTLE layout detected when fast cluster exceeds LITTLE by >12%.
          if (highest > (lowest * 112L) / 100L) {
            val threshold = (highest * 78L) / 100L
            val bigCount = maxFreqs.count { it >= threshold }
            return bigCount.coerceIn(MIN_THREADS, MAX_THREADS)
          }
          return (maxFreqs.size / 2).coerceIn(MIN_THREADS, MAX_THREADS)
        }
      }
    } catch (_: Throwable) {
      // Restricted sysfs or desktop emulator — fall back to conservative core half-count.
    }
    val avail = Runtime.getRuntime().availableProcessors()
    return if (avail <= 2) avail.coerceAtLeast(1) else (avail / 2).coerceIn(MIN_THREADS, MAX_THREADS)
  }
}
