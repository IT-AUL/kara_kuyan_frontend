"""Generate synthetic printed-letter cells and golden outputs for parity tests.

Synthetic cells check *implementation parity* (Python vs Kotlin) only. They say nothing about
handwriting accuracy. No student data is involved, so outputs are safe to commit.
Outputs (tools/ocr-lab/fixtures/):
  cells/<idx>_<label>.png      raw cell images (BGR, ~100 px)
  golden_inp64.bin             uint8, N x 64 x 64, cells preprocessed by the authors' classify_cell (preprocess_server.py)
  golden.json                  labels, file order, logits for FP32 and INT8
"""
import json
import pathlib
import sys

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageDraw, ImageFont

from preprocess import ALPHABET, ALPHABET_GUIDE
from preprocess_server import preprocess_cell_server as preprocess_cell

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "fixtures"
FONT_ROOT = pathlib.Path(__file__).resolve().parents[2] / "node_modules/.pnpm"
FONTS = [
    next(FONT_ROOT.glob("@expo-google-fonts+onest@*/node_modules/@expo-google-fonts/onest/700Bold/Onest_700Bold.ttf")),
    next(FONT_ROOT.glob("@expo-google-fonts+onest@*/node_modules/@expo-google-fonts/onest/500Medium/Onest_500Medium.ttf")),
    next(FONT_ROOT.glob("@expo-google-fonts+noto-sans@*/node_modules/@expo-google-fonts/noto-sans/400Regular/NotoSans_400Regular.ttf")),
]
MODEL_DIR = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "~/Downloads/iMe Desktop").expanduser()
SIZE = 100
rng = np.random.default_rng(20260919)


def render(char: str, font_path: pathlib.Path) -> np.ndarray:
    bg = int(rng.integers(200, 246))
    ink = int(rng.integers(20, 90))
    img = Image.new("L", (SIZE, SIZE), bg)
    font = ImageFont.truetype(str(font_path), int(SIZE * rng.uniform(0.55, 0.7)))
    draw = ImageDraw.Draw(img)
    box = draw.textbbox((0, 0), char, font=font)
    x = (SIZE - (box[2] - box[0])) / 2 - box[0] + rng.uniform(-4, 4)
    y = (SIZE - (box[3] - box[1])) / 2 - box[1] + rng.uniform(-4, 4)
    draw.text((x, y), char, fill=ink, font=font)
    arr = np.array(img.rotate(float(rng.uniform(-5, 5)), fillcolor=bg, resample=Image.BICUBIC))
    for side in range(4):  # grid-line artifacts on random borders
        if rng.random() < 0.5:
            t = int(rng.integers(1, 4))
            line = int(rng.integers(60, 140))
            if side == 0: arr[:t, :] = line
            elif side == 1: arr[-t:, :] = line
            elif side == 2: arr[:, :t] = line
            else: arr[:, -t:] = line
    arr = cv2.GaussianBlur(arr, (0, 0), float(rng.uniform(0.4, 1.2)))
    return cv2.cvtColor(arr, cv2.COLOR_GRAY2BGR)


def main():
    (OUT / "cells").mkdir(parents=True, exist_ok=True)
    sessions = {
        name: ort.InferenceSession(str(MODEL_DIR / f"tatar_ocr_uppercase39_{name}.onnx"), providers=["CPUExecutionProvider"])
        for name in ("fp32", "int8")
    }
    files, labels, inp64s, tensors = [], [], [], []
    for idx, char in enumerate(ALPHABET):
        for v, font in enumerate(FONTS):
            img = render(char, font)
            name = f"{idx:02d}_{v}.png"
            cv2.imwrite(str(OUT / "cells" / name), img)
            inp64, tensor, is_empty = preprocess_cell(img)
            assert not is_empty, name
            files.append(name); labels.append(idx); inp64s.append(inp64); tensors.append(tensor[0])
    batch = np.stack(tensors)
    (OUT / "golden_inp64.bin").write_bytes(np.stack(inp64s).astype(np.uint8).tobytes())
    golden = {"alphabet": ALPHABET, "files": files, "labels": labels, "count": len(files)}
    for name, sess in sessions.items():
        logits = sess.run(None, {"input": batch})[0]
        golden[f"logits_{name}"] = np.round(logits, 5).tolist()
        pred = logits.argmax(1)
        golden[f"argmax_{name}"] = pred.tolist()
        guide_hits = np.mean([ALPHABET_GUIDE[p] == ALPHABET[l] for p, l in zip(pred, labels)])
        print(f"{name}: accuracy on synthetic cells, observed order {np.mean(pred == np.array(labels)):.3f}, "
              f"guide order {guide_hits:.3f} ({len(labels)} cells)")
    agree = np.mean(np.array(golden["argmax_fp32"]) == np.array(golden["argmax_int8"]))
    print(f"FP32 vs INT8 argmax agreement: {agree:.3f}")
    (OUT / "golden.json").write_text(json.dumps(golden, ensure_ascii=False))


if __name__ == "__main__":
    main()
