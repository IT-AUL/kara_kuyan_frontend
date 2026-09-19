package expo.modules.ocrnative

import android.content.Context
import java.io.File
import java.security.MessageDigest

/**
 * OCR models ship inside the APK (assets, from repo `models/ocr`). ONNX Runtime wants a file path, so the model is
 * extracted once into filesDir/models and re-extracted if the checksum from ocr-manifest.json does not match.
 */
object ModelStore {
  @Synchronized
  fun resolve(context: Context, fileName: String, sha256: String): File {
    val dir = File(context.filesDir, "models").apply { mkdirs() }
    val target = File(dir, fileName)
    if (target.isFile && sha256Of(target).equals(sha256, ignoreCase = true)) return target

    val tmp = File(dir, "$fileName.tmp")
    context.assets.open(fileName).use { input -> tmp.outputStream().use { input.copyTo(it) } }
    if (!sha256Of(tmp).equals(sha256, ignoreCase = true)) {
      tmp.delete()
      throw IllegalStateException("Bundled model $fileName does not match the manifest checksum")
    }
    if (!tmp.renameTo(target)) throw IllegalStateException("Cannot store model $fileName")
    return target
  }

  private fun sha256Of(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
      val buf = ByteArray(64 * 1024)
      while (true) {
        val n = input.read(buf)
        if (n < 0) break
        digest.update(buf, 0, n)
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }
}
