package expo.modules.appupdater

import androidx.core.content.FileProvider

/** Own subclass so the manifest entry cannot collide with other libraries' FileProviders. */
class UpdateFileProvider : FileProvider()
