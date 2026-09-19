package expo.modules.appupdater

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * Self-update helper (ADR 0008). Knows nothing about OCR or the backend: it reports the phone's ABIs, downloads a
 * release APK over https into the app cache, verifies its SHA-256 and hands it to the system installer.
 */
class AppUpdaterModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("NO_CONTEXT", "React context is not available", null)

  private val updatesDir: File
    get() = File(context.cacheDir, "updates")

  override fun definition() = ModuleDefinition {
    Name("AppUpdater")
    Events("onProgress")

    Function("supportedAbis") { Build.SUPPORTED_ABIS.toList() }

    Function("canInstallPackages") {
      Build.VERSION.SDK_INT < Build.VERSION_CODES.O || context.packageManager.canRequestPackageInstalls()
    }

    Function("openInstallSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
      null
    }

    AsyncFunction("downloadApk") { url: String, sha256: String ->
      if (!url.startsWith("https://")) throw CodedException("BAD_URL", "Only https downloads are allowed", null)
      updatesDir.deleteRecursively()
      updatesDir.mkdirs()
      val target = File(updatesDir, "update.apk")
      val digest = MessageDigest.getInstance("SHA-256")

      val conn = URL(url).openConnection() as HttpURLConnection
      conn.connectTimeout = 15_000
      conn.readTimeout = 30_000
      conn.instanceFollowRedirects = true
      try {
        if (conn.responseCode != HttpURLConnection.HTTP_OK) {
          throw CodedException("HTTP_${conn.responseCode}", "Download failed with HTTP ${conn.responseCode}", null)
        }
        val total = conn.contentLengthLong
        var done = 0L
        var lastPercent = -1
        conn.inputStream.use { input ->
          target.outputStream().use { output ->
            val buf = ByteArray(64 * 1024)
            while (true) {
              val n = input.read(buf)
              if (n < 0) break
              output.write(buf, 0, n)
              digest.update(buf, 0, n)
              done += n
              if (total > 0) {
                val percent = (done * 100 / total).toInt()
                if (percent != lastPercent) {
                  lastPercent = percent
                  sendEvent("onProgress", mapOf("fraction" to done.toDouble() / total))
                }
              }
            }
          }
        }
      } catch (e: Exception) {
        target.delete()
        throw e
      } finally {
        conn.disconnect()
      }

      val actual = digest.digest().joinToString("") { "%02x".format(it) }
      if (!actual.equals(sha256, ignoreCase = true)) {
        target.delete()
        throw CodedException("CHECKSUM_MISMATCH", "Downloaded file does not match the published checksum", null)
      }
      target.absolutePath
    }

    Function("installApk") { path: String ->
      val file = File(path)
      if (file.parentFile?.canonicalPath != updatesDir.canonicalPath || !file.isFile) {
        throw CodedException("BAD_PATH", "Not a downloaded update", null)
      }
      val uri = FileProvider.getUriForFile(context, "${context.packageName}.appupdater", file)
      val intent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(uri, "application/vnd.android.package-archive")
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }
}
