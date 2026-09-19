# Android release (GitHub Actions)

Workflows: `.github/workflows/ci.yml` (lint, typecheck, test, check-deps on PR/main) and
`.github/workflows/release-android.yml` (signed APKs → GitHub Release). `android/` is generated and
git-ignored, so CI runs `expo prebuild` and then `scripts/ci/patch-android-release.mjs`
(release signing, per-ABI splits, versionCode).

## Cut a release
1. Bump `expo.version` in `app.json` (e.g. `0.2.0`), commit, push to `main`.
2. `git tag v0.2.0 && git push origin v0.2.0` — the tag **must equal** `app.json` version or the build fails.
3. The Release gets 4 APKs + `SHA256SUMS.txt`:
   `arm64-v8a` (nearly all modern phones), `armeabi-v7a` (old 32-bit), `x86_64` (emulators), `universal`.

Manual run (Actions → Release Android → Run workflow) builds the same APKs as a 30-day artifact;
`publish` only works when the run is on a tag; `allow_debug_signing` is a dry run without keystore.

## One-time setup: signing key
Generate once and **back it up** (losing it means users cannot update the app):
```bash
keytool -genkeypair -v -keystore kara-kuyan-release.keystore -alias kara-kuyan -keyalg RSA -keysize 2048 -validity 10000
base64 -i kara-kuyan-release.keystore | pbcopy   # -> ANDROID_KEYSTORE_BASE64
```
Repo → Settings → Secrets and variables → Actions:
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
Keystores are git-ignored (`*.keystore`, `*.jks`).

## Known limits
- OCR models live in `models/ocr/` (FP32 + INT8, SHA-256 in `SHA256SUMS`, checked in CI). The native module does not
  package them yet — it still reads `filesDir/ocr-lab/models` — so loading from assets is a separate native change.
- R8/shrink is off (`android.enableMinifyInReleaseBuilds` default) until keep rules for ONNX Runtime / OpenCV / ML Kit
  are verified on a device.
- `EXPO_PUBLIC_SYNC_URL` is not set in CI: the release build does not sync to a backend.

## Branding and store metadata
- Sources: `assets/branding/icon.svg` (app tile) and `assets/branding/logo.svg` (glyph). Rasters in `assets/images/` are generated:
  `npm i --no-save @resvg/resvg-js && node scripts/branding/generate-icons.mjs` — do not edit the PNGs by hand.
- `icon.png` is a full-bleed 1024 square (the OS applies the mask). Android adaptive icon = solid `#25E38A` background +
  dark glyph foreground inside the 66/108 safe zone + monochrome (themed icon). Splash = green glyph on `#0B0F0D`.
- `app.json` production settings: `description`, `allowBackup: false` (grades/roster stay out of cloud backups),
  `blockedPermissions` (overlay, external storage, microphone are never needed — zero-photo), `softwareKeyboardLayoutMode: resize`,
  `ios.bundleIdentifier`. The camera permission comes from `modules/ocr-native`.
- Changing the icon requires `expo prebuild --clean` locally (then redo `android/gradle.properties` edits); CI always prebuilds.
