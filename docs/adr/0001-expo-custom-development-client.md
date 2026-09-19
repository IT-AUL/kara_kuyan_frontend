# ADR 0001: Expo custom development client

**Status:** Accepted

## Context

The product requires on-device OpenCV/ArUco, QR decoding, and ONNX inference in a native pipeline. Expo Go cannot host custom native code.

## Decision

One Expo React Native application built as a **custom development client** (prebuild, New Architecture only), with local Expo Modules for app-specific Kotlin/JNI code. Expo Go is not a supported target.

## Consequences

- Positive: official Expo path for app-specific native code; keeps Expo tooling (Router, install, doctor).
- Negative: every native dependency must be config-plugin/prebuild compatible; no Expo Go for quick demos; native build required for all contributors.
- Risk: config-plugin gaps (e.g., VisionCamera v5 manual config) — handled by the camera spike.
