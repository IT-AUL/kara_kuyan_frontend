package expo.modules.ocrnative

import org.opencv.android.OpenCVLoader
import org.opencv.core.Mat

/**
 * JNI wrapper over canonical C++20 `tatar_ocr::NativeBlankScanner` (`third_party/tatar_ocr/native`).
 *
 * Load order matters on Android:
 * 1. `OpenCVLoader.initLocal()` loads `libopencv_java5.so`
 * 2. `System.loadLibrary("onnxruntime")` loads `libonnxruntime.so`
 * 3. `System.loadLibrary("tatar_ocr_jni")` loads our C++20 core + JNI bridge
 */
class NativeBlankScannerBridge(
  modelPath: String,
  specPath: String,
  val modelSha256: String,
) : AutoCloseable {

  companion object {
    @Volatile private var loaded = false

    @Synchronized
    fun ensureLoaded() {
      if (loaded) return
      check(OpenCVLoader.initLocal()) { "OPENCV_LOAD_FAILED" }
      System.loadLibrary("onnxruntime")
      System.loadLibrary("tatar_ocr_jni")
      loaded = true
    }
  }

  private var handle: Long = 0L

  init {
    ensureLoaded()
    handle = nativeCreate(modelPath, specPath)
    check(handle != 0L) { "NATIVE_SCANNER_CREATE_FAILED" }
  }

  fun processBlank(imgBgr: Mat, outRectifiedBgr: Mat): String {
    check(handle != 0L) { "NATIVE_SCANNER_CLOSED" }
    return nativeProcessBlank(handle, imgBgr.nativeObjAddr, outRectifiedBgr.nativeObjAddr)
  }

  fun detectMarkersPadded(previewImg: Mat, pad: Int = 0): String {
    check(handle != 0L) { "NATIVE_SCANNER_CLOSED" }
    return nativeDetectMarkers(handle, previewImg.nativeObjAddr, pad)
  }

  fun classifyCell(cellImg: Mat): String {
    check(handle != 0L) { "NATIVE_SCANNER_CLOSED" }
    return nativeClassifyCell(handle, cellImg.nativeObjAddr)
  }

  @Synchronized
  override fun close() {
    val ptr = handle
    if (ptr != 0L) {
      handle = 0L
      nativeDestroy(ptr)
    }
  }

  private external fun nativeCreate(modelPath: String, specPath: String): Long
  private external fun nativeDestroy(ptr: Long)
  private external fun nativeDetectMarkers(ptr: Long, matAddr: Long, pad: Int): String
  private external fun nativeProcessBlank(ptr: Long, bgrMatAddr: Long, outRectifiedMatAddr: Long): String
  private external fun nativeClassifyCell(ptr: Long, cellMatAddr: Long): String
}
