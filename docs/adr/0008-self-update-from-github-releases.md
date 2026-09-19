# ADR 0008 — Self-update from GitHub Releases

Status: Accepted (2026-09-20)

## Context
Builds are distributed as signed APKs on GitHub Releases (`docs/delivery/release.md`). Teachers should learn about and install new versions without hunting for the release page.

## Decision
- On launch (release builds only, when online) the app asks `GET https://api.github.com/repos/IT-AUL/kara_kuyan_frontend/releases/latest` (public repo, no token). If the tag is a newer plain `X.Y.Z` (no pre-release suffix) it shows a dismissible banner.
- On tap, a small local Expo module (`modules/app-updater`, no OCR or backend knowledge) downloads the APK matching the phone's first supported ABI (fallback `universal`) into the app cache, verifies SHA-256 from the release's `SHA256SUMS.txt`, and opens the system installer through a private `FileProvider`. Android verifies that the signing key matches the installed app; the user confirms installation.
- Needs `REQUEST_INSTALL_PACKAGES` and the user's one-time "install from this app" grant.

## Consequences
- New outbound traffic: `api.github.com` (release metadata) and the release asset host. No teacher data, no images, no identifiers are sent (only standard HTTP headers). Zero-photo (ADR 0003) is unaffected; the network-capture gate must allow these two hosts.
- The APK in cache is an app package, not a camera frame; it is deleted before each download and after install is handed over.
- The checksum guards against corruption; authenticity rests on Android's signature check.
- Never updates dev builds (`__DEV__`) or pre-releases.
