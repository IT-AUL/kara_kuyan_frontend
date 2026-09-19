"""Cell preprocessing, exact port of the authors' `BlankOCRScanner.classify_cell`
(DanisGaleev/tatar_ocr, blank_pipeline.py:190-294, commit 796601e). Reimplemented from reading the
source; the repository has no licence, so no code is copied. Reference for Kotlin parity.

Notes for the Kotlin port:
- Python `round` is banker's rounding (round-half-even): use Math.rint, not Math.round.
- Percentile: numpy default linear interpolation.
- connectedComponentsWithStats default connectivity is 8.
Returns (inp_64 uint8 [64,64], tensor float32 [1,1,64,64], is_empty).
"""
import cv2
import numpy as np


def _empty():
    blank = np.full((64, 64), 250, np.uint8)
    return blank, ((blank.astype(np.float32) / 255.0 - 0.5) / 0.5)[None, None], True


def preprocess_cell_server(cell, margin_trim_pct=8, tolerant_lines=False):
    gray = cell if cell.ndim == 2 else cv2.cvtColor(cell, cv2.COLOR_BGR2GRAY)
    ch, cw = gray.shape[:2]
    if ch < 10 or cw < 10:
        return _empty()

    my = max(1, int(round(ch * (margin_trim_pct / 100.0))))
    mx = max(1, int(round(cw * (margin_trim_pct / 100.0))))
    inner = gray[my:ch - my, mx:cw - mx]
    ih, iw = inner.shape[:2]
    if ih < 8 or iw < 8:
        return _empty()

    bg_val = float(np.median(inner))
    ink_mask = (inner < (bg_val - 22)).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(ink_mask)
    if n <= 1:
        return _empty()

    valid = np.zeros_like(ink_mask)
    total = 0
    for i in range(1, n):
        area = stats[i, cv2.CC_STAT_AREA]
        bw, bh = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
        if tolerant_lines:  # app path (CellPreprocessor tolerantLines): thin long strips are printed-line remnants
            is_edge_line = (bw > 0.7 * iw and bh <= 8) or (bh > 0.7 * ih and bw <= 8)
        else:               # authors' exact rule (golden parity)
            is_edge_line = (bw > 0.88 * iw and bh <= 3) or (bh > 0.88 * ih and bw <= 3)
        if area >= 18 and not is_edge_line:
            valid[labels == i] = 1
            total += area
    if total < 30:
        return _empty()

    ys, xs = np.where(valid > 0)
    x1, x2 = int(xs.min()), int(xs.max())
    y1, y2 = int(ys.min()), int(ys.max())
    pad = 2
    x1, y1 = max(0, x1 - pad), max(0, y1 - pad)
    x2, y2 = min(iw - 1, x2 + pad), min(ih - 1, y2 + pad)
    glyph = inner[y1:y2 + 1, x1:x2 + 1]
    gh, gw = glyph.shape[:2]

    scale = 46.0 / float(max(gh, gw) + 1e-5)
    new_w = max(1, min(60, int(round(gw * scale))))
    new_h = max(1, min(60, int(round(gh * scale))))
    interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_LANCZOS4
    resized = cv2.resize(glyph, (new_w, new_h), interpolation=interp)

    p_lo, p_hi = np.percentile(resized, 2), np.percentile(resized, 98)
    norm = np.clip((resized.astype(np.float32) - p_lo) / (p_hi - p_lo + 1e-5) * 240.0 + 10.0, 0, 255).astype(np.uint8)

    inp_64 = np.full((64, 64), 250, np.uint8)
    off_x, off_y = (64 - new_w) // 2, (64 - new_h) // 2
    inp_64[off_y:off_y + new_h, off_x:off_x + new_w] = norm
    tensor = ((inp_64.astype(np.float32) / 255.0) - 0.5) / 0.5
    return inp_64, tensor[None, None], False
