# ADR 0005: ONNX Runtime first, benchmark-driven

**Status:** Accepted for the inference lane (2026-09-19, CPU benchmark on SM-S928B); camera choice is a separate decision

**Evidence:** `harness/changes/active/p0-camera-runtime-spike/evidence/benchmark.md` — for one 72-cell sheet, FP32 + XNNPACK with 6 threads ≈ 110 ms warm median (p95 ≤ 128 ms); supplied dynamic INT8 on CPU best ≈ 148 ms (4 threads), slower above 4 threads; model + Kotlin preprocessing ≈ 140 ms of the 3 s budget. So FP32 + XNNPACK is the default lane; dynamic INT8 gives no benefit, and QNN/NPU, calibrated static INT8 and ExecuTorch are not needed unless the end-to-end measurement (camera, geometry, QR) misses the budget.

## Context

Two ONNX artifacts exist (FP32 and dynamic INT8). Candidates: ONNX Runtime Android (AAR inside the native module — not the JS binding), and ExecuTorch, which would require a reproducible `.pte` export and cannot consume the ONNX files.

## Decision

Start with **ONNX Runtime Android inside the native OCR module**. Benchmark matrix on the user's physical phone: FP32 + XNNPACK vs supplied dynamic INT8 on CPU vs a future calibrated static INT8 (QDQ/QOperator). ExecuTorch stays deferred unless a `.pte` export measurably beats the winner. XNNPACK cannot execute the supplied `ConvInteger` graph — INT8 lanes run on CPU.

## Consequences

- Positive: shortest path for existing artifacts; official Android AAR support; CPU-first is the documented mobile starting point.
- Negative: adds a native AAR dependency; dynamic INT8 may not beat FP32+XNNPACK — the decision is provisional until device numbers exist.
- Constraint: no unverified external latency claims accepted; only instrumented runs against the ≤3 s sheet budget decide.

> **Amendment (2026-11-11, `ocr-v4-prime`):** Upgraded bundled weights from `v1` (`TatarOCRNet`) to **`v4` (`TatarOCRNetV3_MultiScale`: `tatar_ocr_v4_handwritten39_fp32.onnx` 3.61 MB & `tatar_ocr_v4_handwritten39_int8.onnx` 0.98 MB)** trained on real Tatar handwriting (`97.98%` validation accuracy, `98.25%` Top-3). To keep inference fast across budget `2+6`, mid-range `4+4`, and flagship `1+3+4` / `1+5+2` Android SoCs without barrier synchronization stalls on LITTLE efficiency cores:
> 1. `CpuTopology` inspects `/sys/devices/system/cpu/cpu*/cpufreq/cpuinfo_max_freq` at runtime and sizes `intra_op_num_threads` to the physical big/Prime core count (clamped to `[2, 4]`), replacing the hardcoded `6` threads.
> 2. `OrtEngine` enables `GraphOptimizationLevel.ALL_OPT`, `setMemoryPatternOptimization(true)`, `session.intra_op.allow_spinning = "0"`, and executes a background `[1, 1, 64, 64]` warmup inference on camera start so XNNPACK kernel packing incurs zero first-sheet latency.
> 3. `FP32 + XNNPACK` remains the primary lane with automatic runtime fallback to `INT8 + CPU` (`ConvInteger`) if XNNPACK initialization fails on older/32-bit Android ROMs.
>
> **Amendment (2026-11-12, `cpp-native-ocr-pipeline`):** Replaced the hand-ported Kotlin/Java CV + ORT wrapper with the canonical upstream C++20 `tatar_ocr_core` (`tatar_ocr::NativeBlankScanner`) from `DanisGaleev/tatar_ocr` (`v3-architecture-training`), linked as an unmodified Git submodule (`third_party/tatar_ocr`) via Android NDK CMake + JNI (`tatar_ocr_jni`) inside `modules/ocr-native`:
> 1. `tatar_ocr_core` links dynamically against Prefab `opencv::opencv_java5` (`org.opencv:opencv:5.0.0`) and `libonnxruntime.so` (`com.microsoft.onnxruntime:onnxruntime-android:1.30.0`), consuming `pipeline_spec.json` and `tatar_ocr_v4_handwritten39_int8.onnx` extracted to `context.filesDir`.
> 2. Eliminates Kotlin/Python divergence (whole-sheet border suppression removed upstream in `d27477b`, exact banker's rounding, anchor-centroid homography, question-row fallback anchors, and deterministic Stage-6 diacritic guard).
> 3. All `cv::Mat` frames and rectified buffers remain strictly in native C++/JNI memory and are freed immediately after QR + OCR extraction (ADR 0003).
