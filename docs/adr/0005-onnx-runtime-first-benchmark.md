# ADR 0005: ONNX Runtime first, benchmark-driven

**Status:** Proposed (benchmark pending)

## Context

Two ONNX artifacts exist (FP32 and dynamic INT8). Candidates: ONNX Runtime Android (AAR inside the native module — not the JS binding), and ExecuTorch, which would require a reproducible `.pte` export and cannot consume the ONNX files.

## Decision

Start with **ONNX Runtime Android inside the native OCR module**. Benchmark matrix on the user's physical phone: FP32 + XNNPACK vs supplied dynamic INT8 on CPU vs a future calibrated static INT8 (QDQ/QOperator). ExecuTorch stays deferred unless a `.pte` export measurably beats the winner. XNNPACK cannot execute the supplied `ConvInteger` graph — INT8 lanes run on CPU.

## Consequences

- Positive: shortest path for existing artifacts; official Android AAR support; CPU-first is the documented mobile starting point.
- Negative: adds a native AAR dependency; dynamic INT8 may not beat FP32+XNNPACK — the decision is provisional until device numbers exist.
- Constraint: no unverified external latency claims accepted; only instrumented runs against the ≤3 s sheet budget decide.
