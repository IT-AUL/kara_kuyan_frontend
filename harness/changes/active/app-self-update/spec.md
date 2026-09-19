# Spec — app-self-update

## Goal
A teacher with an installed build sees «Доступна версия X.Y.Z» when a newer GitHub Release exists, taps «Обновить», and the app downloads the APK for the phone's ABI and opens the system installer. Data is kept (same signing key).

## Non-goals
- Silent/background install (Android requires the user's confirmation).
- OTA JS updates (`expo-updates`), Play Store distribution, delta updates, pre-release channel.
- Forced updates / minimum-version gating.

## Assumptions
- Repo `IT-AUL/kara_kuyan_frontend` is public, so `releases/latest` needs no token (verified 2026-09-20: visibility PUBLIC).
- Release assets follow `kara-kuyan-v<ver>-<abi>.apk` + `SHA256SUMS.txt` (release-android.yml).
- Release APKs are signed with one key (secrets set 2026-09-19); debug/dev builds are never updated this way.
- The GitHub download redirects to `objects.githubusercontent.com` (unverified on device).

## Acceptance criteria
- [ ] Version comparison, ABI asset choice and checksum parsing are unit-tested (`pnpm test`).
- [ ] Native module compiles in a release build (`:app:assembleRelease`) with the FileProvider + permission merged.
- [ ] On the reference phone: with an older installed version, the banner appears, download shows progress, installer opens, app updates in place keeping data.
- [ ] Offline / GitHub error / no newer version: no banner, no crash, app unaffected.
- [ ] Checksum mismatch aborts before the installer opens.
- [ ] Zero-photo unchanged: the only new network calls are GitHub release metadata + the APK; ADR 0008 records it.

## Open questions
- None blocking. Whether to nag once per session or every launch (default: once per launch, dismissible).
