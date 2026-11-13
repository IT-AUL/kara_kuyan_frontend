package expo.modules.ocrnative

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.view.MotionEvent
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/**
 * Native 4:3 camera preview (`FIT_CENTER` so 20:9 displays never crop top/bottom/side ArUco markers)
 * with interactive tap-to-focus. Frames never reach JS; alignment numbers arrive via `onAlignment`.
 */
@SuppressLint("ClickableViewAccessibility")
class OcrCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onAlignment by EventDispatcher<Map<String, Any?>>()
  private val previewView = PreviewView(context).apply {
    scaleType = PreviewView.ScaleType.FIT_CENTER
    setBackgroundColor(Color.rgb(12, 16, 14))
    setOnTouchListener { v, event ->
      if (event.action == MotionEvent.ACTION_UP) {
        v.performClick()
        CameraController.focusAt(this, event.x, event.y)
      }
      true
    }
  }
  override val shouldUseAndroidLayout = true

  init {
    addView(previewView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

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
