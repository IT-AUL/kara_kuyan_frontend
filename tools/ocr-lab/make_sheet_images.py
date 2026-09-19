"""Make still images of the fixture sheets for the on-device geometry/QR test (spike task 10).
Synthetic sheets only (no student data). Output: tools/ocr-lab/out/sheets/*.jpg (git-ignored)."""
import pathlib

import cv2
import numpy as np

import e2e_desktop as e

OUT = pathlib.Path(__file__).parent / "out" / "sheets"
OUT.mkdir(parents=True, exist_ok=True)
GEN = e.GEN


def save(name, img):
    cv2.imwrite(str(OUT / name), img, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(name, img.shape[1], "x", img.shape[0])


filled = e.rasterize(GEN / "sheet_filled.pdf", 300)
blank = e.rasterize(GEN / "live_blank_TAT-2026-Q1_var1.pdf", 300)
save("filled_clean.jpg", filled)
for s in (1, 2, 3):
    save(f"filled_photo{s}.jpg", e.degrade(filled, s))
save("live_blank_clean.jpg", blank)
save("live_blank_photo1.jpg", e.degrade(blank, 1))

# occlude the bottom-right corner marker (id 3) with a white patch -> exercises the contour fallback
occluded = e.degrade(filled, 4)
h, w = occluded.shape[:2]
occ = filled.copy()
mm = 300 / 25.4
x0, y0, x1, y1 = [int(v * mm) for v in (188, 275, 206, 293)]
occ[y0:y1, x0:x1] = 255
save("filled_marker3_hidden.jpg", e.degrade(occ, 5))
