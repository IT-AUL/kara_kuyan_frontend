package expo.modules.ocrnative

import android.content.Context
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/** Native camera preview. Frames never reach JS; alignment numbers arrive via `onAlignment`. */
class OcrCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onAlignment by EventDispatcher<Map<String, Any?>>()
  private val previewView = PreviewView(context).apply { scaleType = PreviewView.ScaleType.FILL_CENTER }
  override val shouldUseAndroidLayout = true

  init { addView(previewView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)) }

  fun setActive(active: Boolean) {
    if (active) {
      val owner = appContext.currentActivity as? LifecycleOwner ?: return
      CameraController.start(context, owner, previewView) { onAlignment(it) }
    } else {
      CameraController.stop()
    }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    CameraController.stop()
  }
}
