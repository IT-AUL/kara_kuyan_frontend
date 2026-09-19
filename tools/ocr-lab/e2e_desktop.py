"""Desktop end-to-end check against the authors' algorithms (DanisGaleev/tatar_ocr, commit 796601e),
re-implemented from reading blank_pipeline.py: rectify_sheet (4 marker corners -> canvas points),
extract_cells (name row, question rows snapped to the per-question ArUco markers, cell count from
vertical grid lines) and classify_cell (preprocess_server.py).

Timings are desktop-only and are NOT evidence for the device budget.
"""
import json
import pathlib
import time

import cv2
import numpy as np
import onnxruntime as ort
import pymupdf

from preprocess import ALPHABET
from preprocess_server import preprocess_cell_server

ROOT = pathlib.Path(__file__).parent
GEN = ROOT.parent / "sheet-gen" / "out"
MODEL = pathlib.Path("~/Downloads/iMe Desktop/tatar_ocr_uppercase39_fp32.onnx").expanduser()
W, H = 2100, 2970
DST = np.float32([[60, 60], [2040, 60], [2040, 2910], [60, 2910]])  # marker 0 TL, 1 TR, 3 BR, 2 BL

bundle = json.loads((GEN / "bundle.json").read_text())["variants"][0]
sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
detector = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50), cv2.aruco.DetectorParameters())


def rasterize(pdf, dpi):
    pix = pymupdf.open(str(pdf))[0].get_pixmap(dpi=dpi, colorspace=pymupdf.csGRAY)
    return cv2.cvtColor(np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width), cv2.COLOR_GRAY2BGR)


def degrade(bgr, seed):
    rng = np.random.default_rng(seed)
    h, w = bgr.shape[:2]
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = (src + rng.uniform(-0.04, 0.04, (4, 2)) * [w, h] + [w * 0.05, h * 0.05]).astype(np.float32)
    out = cv2.warpPerspective(bgr, cv2.getPerspectiveTransform(src, dst), (int(w * 1.1), int(h * 1.1)), borderValue=(200, 200, 200))
    out = cv2.GaussianBlur(out, (0, 0), 1.4)
    out = out.astype(np.float32) * np.linspace(0.75, 1.05, out.shape[1])[None, :, None]
    out += rng.normal(0, 5, out.shape)
    return np.clip(out, 0, 255).astype(np.uint8)


def rectify(img):
    corners, ids, _ = detector.detectMarkers(img)
    m = {int(i): c[0] for i, c in zip(ids.flatten(), corners)} if ids is not None else {}
    if not all(k in m for k in (0, 1, 2, 3)):
        return None
    src = np.float32([m[0][0], m[1][1], m[3][2], m[2][3]])
    return cv2.warpPerspective(img, cv2.getPerspectiveTransform(src, DST), (W, H), flags=cv2.INTER_LANCZOS4)


def name_cells_from_lines(v_lines, name_top):
    """16 name cells from vertical grid lines (backend template versions differ: 9 mm vs 8 mm cells); None if not found."""
    band = v_lines[name_top + 6:name_top + 13, 440:1960]  # strip under the top border: grid lines only, no glyph strokes
    col = band.sum(axis=0) // 255
    on = np.where(col > 4)[0]
    if len(on) == 0:
        return None
    groups = np.split(on, np.where(np.diff(on) > 1)[0] + 1)
    centers = [440 + (g[0] + g[-1]) / 2 for g in groups]
    if len(centers) < 17:
        return None
    d = np.diff(centers)
    for s in range(len(centers) - 16):
        w = d[s:s + 16]
        pitch = float(np.sort(w)[8])
        if 70 <= pitch <= 100 and np.all(np.abs(w - pitch) <= 6):
            return [(int(centers[s + i]), name_top, int(pitch), int(pitch)) for i in range(16)]
    return None


def extract_cells(rect):
    gray = cv2.cvtColor(rect, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 10)
    v_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 35)))
    sobel_y = np.abs(cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3))
    name_top = 200 + int(np.argmax(sobel_y[200:245, 470:1910].mean(axis=1)))
    name = name_cells_from_lines(v_lines, name_top) or [(int(474 + i * 89.9), name_top, 90, 96) for i in range(16)]
    corners, ids, _ = detector.detectMarkers(rect)
    q = {int(i): c[0] for i, c in zip(ids.flatten(), corners) if int(i) >= 11} if ids is not None else {}
    rows = []
    for mid in sorted(q):
        my = float(q[mid][:, 1].mean())
        y0 = int(my - 40)
        y = y0 + int(np.argmax(sobel_y[y0:int(my + 40), 220:1020].mean(axis=1)))
        count = 0
        for c in range(1, 13):
            xd = 220 + c * 100
            if np.sum(v_lines[y + 15:y + 80, xd - 10:xd + 10] > 0) > 100:
                count = c
            else:
                break
        rows.append((mid, [(220 + j * 100, y, 100, 95) for j in range(max(1, min(count or 8, 12)))]))
    return name, rows


def read(rect, boxes):
    crops = [rect[y:y + h, x:x + w] for x, y, w, h in boxes]
    outs = [preprocess_cell_server(c) for c in crops]
    empty = [o[2] for o in outs]
    probs = np.zeros((len(outs), 39), np.float32)
    idx = [i for i, e in enumerate(empty) if not e]
    if idx:
        lg = sess.run(None, {"input": np.stack([outs[i][1][0] for i in idx])})[0]
        p = np.exp(lg - lg.max(1, keepdims=True)); p /= p.sum(1, keepdims=True)
        probs[idx] = p
    return ["" if e else ALPHABET[int(p.argmax())] for e, p in zip(empty, probs)]


def qr_text(rect):
    return cv2.QRCodeDetector().detectAndDecode(rect[40:260, 200:440])[0]


def main():
    for label, seed in (("clean 300dpi", None), ("degraded photo-like", 1), ("degraded photo-like", 2)):
        img = rasterize(GEN / "sheet_filled.pdf", 300)
        if seed is not None:
            img = degrade(img, seed)
        t0 = time.perf_counter()
        rect = rectify(img)
        print(f"--- {label} seed={seed}")
        if rect is None:
            print("   FAILED: not all four corner markers found"); continue
        t1 = time.perf_counter()
        name_boxes, rows = extract_cells(rect)
        t2 = time.perf_counter()
        name = "".join(read(rect, name_boxes))
        words = [("".join(read(rect, boxes)), mid, len(boxes)) for mid, boxes in rows]
        t3 = time.perf_counter()
        ok = 0
        print(f"   name field read: '{name}'  QR: {qr_text(rect)}")
        for q, (got, mid, n) in zip(bundle["questions"], words):
            exp = q["expected_answer"]
            ok += got == exp
            print(f"   Q{q['question_number']} marker {mid} cells {n}: expected {exp:10s} read {got}{'' if got == exp else '   <-- differs'}")
        print(f"   rows found {len(rows)}/8, answers exact {ok}/8; ms (desktop): rectify {(t1-t0)*1e3:.0f}, locate cells {(t2-t1)*1e3:.0f}, preprocess+infer {(t3-t2)*1e3:.0f}")


if __name__ == "__main__":
    main()
