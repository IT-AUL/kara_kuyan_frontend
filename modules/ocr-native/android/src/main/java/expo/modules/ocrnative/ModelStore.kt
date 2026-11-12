package expo.modules.ocrnative

import android.content.Context
import java.io.File
import java.io.InputStream
import java.security.MessageDigest

/**
 * Copies bundled OCR assets (`tatar_ocr_v4_handwritten39_int8.onnx`, `pipeline_spec.json`)
 * from Android `AssetManager` into `context.filesDir/tatar_ocr/` so C++ `tatar_ocr::NativeBlankScanner`
 * can open them by filesystem path. Automatically refreshes cached files whenever asset SHA-256 changes.
 */
object ModelStore {
  data class ResolvedAsset(val file: File, val sha256: String)

  @Synchronized
  fun resolveAsset(context: Context, assetName: String, expectedSha256: String? = null): ResolvedAsset {
    val assetSha = context.assets.open(assetName).use { sha256Of(it) }
    if (!expectedSha256.isNullOrBlank() && !assetSha.equals(expectedSha256, ignoreCase = true)) {
      throw IllegalStateException("Bundled asset $assetName SHA-256 ($assetSha) != manifest ($expectedSha256)")
    }

    val dir = File(context.filesDir, "tatar_ocr").apply { mkdirs() }
    val target = File(dir, assetName)
    if (target.isFile && target.inputStream().use { sha256Of(it) }.equals(assetSha, ignoreCase = true)) {
      return ResolvedAsset(target, assetSha)
    }

    val tmp = File(dir, "$assetName.tmp")
    context.assets.open(assetName).use { input ->
      tmp.outputStream().use { output -> input.copyTo(output) }
    }
    val copiedSha = tmp.inputStream().use { sha256Of(it) }
    if (!copiedSha.equals(assetSha, ignoreCase = true)) {
      tmp.delete()
      throw IllegalStateException("Corrupted extraction for asset $assetName")
    }
    if (target.exists() && !target.delete()) {
      tmp.delete()
      throw IllegalStateException("Cannot replace stale asset $assetName")
    }
    if (!tmp.renameTo(target)) {
      tmp.delete()
      throw IllegalStateException("Cannot move extracted asset $assetName into place")
    }
    return ResolvedAsset(target, assetSha)
  }

  @Synchronized
  fun resolve(context: Context, fileName: String, sha256: String): File =
    resolveAsset(context, fileName, sha256).file

  private fun sha256Of(stream: InputStream): String {
    val digest = MessageDigest.getInstance("SHA-256")
    val buf = ByteArray(64 * 1024)
    while (true) {
      val n = stream.read(buf)
      if (n < 0) break
      digest.update(buf, 0, n)
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }
}
