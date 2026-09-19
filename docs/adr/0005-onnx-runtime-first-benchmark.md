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
