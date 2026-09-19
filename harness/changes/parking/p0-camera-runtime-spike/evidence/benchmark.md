# Runtime benchmark — SM-S928B, 2026-09-19 (task 9, AC3)

**Setup.** Physical Samsung SM-S928B (SM8650, 8 cores, Android 16), dev client (debug build), app in foreground, screen on, USB-powered at 100% battery, thermal status 0, battery temperature 31.5 °C before → 32.5 °C after run 1 → 33.4 °C after run 2. ONNX Runtime Android 1.30.0, OpenCV 5.0.0. One full sheet = **72 cells** (8 answer rows × 9), batch `[72,1,64,64]`, synthetic printed fixture cells (timing does not depend on the letters). Per config: new session, 1 cold `firstRun`, then **30 warm runs**; median / p95 over the 30. Two full sweeps back to back (`benchmark-run1.json`, `benchmark-run2.json`). XNNPACK config per ORT docs: intra-op spinning off, ORT intra-op threads = 1, XNNPACK pool = N. `fp32+cpu` and `int8+cpu` use ORT's CPU EP with N intra-op threads.

## Inference, warm median / p95 (ms) for one sheet — run 1 | run 2
| Lane | 1 thr | 2 thr | 4 thr | 6 thr | 8 thr |
|---|---|---|---|---|---|
| FP32 + XNNPACK | 393 / 395 \| 383 / 394 | 259 / 261 \| 257 / 258 | 155 / 157 \| 154 / 156 | **110 / 113 \| 111 / 128** | 118 / 124 \| 120 / 134 |
| FP32, CPU EP | 460 / 462 \| 460 / 466 | 318 / 329 \| 306 / 316 | 201 / 205 \| 204 / 208 | 144 / 149 \| 158 / 209 | 135 / 141 \| 157 / 198 |
| dynamic INT8, CPU EP | 211 / 215 \| 212 / 215 | 183 / 187 \| 185 / 189 | 148 / 153 \| 153 / 189 | 159 / 192 \| 187 / 220 | 167 / 209 \| 212 / 242 |

- **Best lane: FP32 + XNNPACK, 6 threads: ≈110 ms median, ≤128 ms p95** (both runs). It is fastest and steadiest; 8 threads is slower (efficiency cores). INT8 wins only at 1–2 threads and degrades above 4 threads; its best (≈148–153 ms, 4 threads) is ~40% slower than FP32+XNNPACK 6 threads.
- **Cold start:** session creation ≈ 7–16 ms (first ever 94 ms, library load). First inference after creation: ≈117–120 ms at the best config, i.e. +6–8% over warm.
- **Preprocessing** (Kotlin, 72 cells, decode excluded): cold ≈ 76 ms, **warm median 26–27 ms** (≈0.37 ms/cell).
- **Model + preprocessing for a full sheet ≈ 140 ms warm** (≈ 190 ms cold) — about 5% of the 3 s budget. Name field (16 more cells) adds ≈ +22%.

## Not covered (do not over-read)
- Only inference and per-cell preprocessing were timed. Camera capture, ArUco/homography, cell location, QR, quality gating and any second-pass TTA are still to be measured (tasks 10–11); desktop OpenCV numbers (rectify 34–126 ms) are not device evidence.
- Debug build, USB-powered, short runs (≈30 runs × 15 configs, a few minutes): not a sustained-thermal or battery test; later configs ran on a slightly warmer device (32.5–33.4 °C) and the noisiest results (CPU EP at 6–8 threads) sit at the end of each lane.
- No camera preview or UI load concurrent with inference; contention on the big cores is expected to raise these numbers.
- Synthetic cells; accuracy is not measured here.
