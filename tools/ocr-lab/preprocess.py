"""Reference cell preprocessing for Tatar OCR Net.

Port of the integration guide (docs/contracts/ocr-integration-reference.md, part 3) with one fix:
the guide's sample indexes/pads as 3-channel BGR and fails on grayscale input. Here grayscale,
BGR and BGRA inputs are all accepted.
"""
import cv2
import numpy as np

# Order documented in the integration guide (Ә last). Measurements on synthetic printed letters show
# the model does NOT use it: every letter after А is shifted by one. Kept for comparison only.
ALPHABET_GUIDE = [
    "А", "Б", "В", "Г", "Д", "Е", "Ё", "Ж", "Җ", "З",
    "И", "Й", "К", "Л", "М", "Н", "Ң", "О", "Ө", "П",
    "Р", "С", "Т", "У", "Ү", "Ф", "Х", "Һ", "Ц", "Ч",
    "Ш", "Щ", "Ъ", "Ы", "Ь", "Э", "Ю", "Я", "Ә",
]

# Observed model order (natural Tatar alphabet, Ә at index 1). Working hypothesis, consistent 39/39
# across three fonts; still to be confirmed on handwriting and with the model's authors.
# The app must read the order from a versioned manifest, never from a hardcoded copy.
ALPHABET = [
    "А", "Ә", "Б", "В", "Г", "Д", "Е", "Ё", "Ж", "Җ",
    "З", "И", "Й", "К", "Л", "М", "Н", "Ң", "О", "Ө",
    "П", "Р", "С", "Т", "У", "Ү", "Ф", "Х", "Һ", "Ц",
    "Ч", "Ш", "Щ", "Ъ", "Ы", "Ь", "Э", "Ю", "Я",
]


def _as_bgr(image: np.ndarray) -> np.ndarray:
    if image.ndim == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    return image


def preprocess_cell(image: np.ndarray, margin_trim_pct: float = 4.0):
    """Returns (inp_64 uint8 [64,64], tensor float32 [1,1,64,64] in [-1, 1])."""
    img = _as_bgr(image)
    h, w = img.shape[:2]

    if margin_trim_pct > 0:
        ty = int(h * (margin_trim_pct / 100.0))
        tx = int(w * (margin_trim_pct / 100.0))
        cropped = img[ty:max(ty + 1, h - ty), tx:max(tx + 1, w - tx)]
    else:
        cropped = img

    ch, cw = cropped.shape[:2]
    side = max(ch, cw)
    edge = np.concatenate([cropped[0, :, :], cropped[-1, :, :], cropped[:, 0, :], cropped[:, -1, :]], axis=0)
    bg = np.median(edge, axis=0).astype(np.uint8)
    padded = np.full((side, side, 3), bg, dtype=np.uint8)
    py, px = (side - ch) // 2, (side - cw) // 2
    padded[py:py + ch, px:px + cw] = cropped

    gray = cv2.cvtColor(padded, cv2.COLOR_BGR2GRAY)
    lo, hi = np.percentile(gray, 2), np.percentile(gray, 98)
    norm = np.clip((gray.astype(np.float32) - lo) / (hi - lo + 1e-5) * 240.0 + 10.0, 0, 255).astype(np.uint8)

    inp_64 = cv2.resize(norm, (64, 64), interpolation=cv2.INTER_AREA)
    tensor = ((inp_64.astype(np.float32) / 255.0) - 0.5) / 0.5
    return inp_64, tensor[np.newaxis, np.newaxis, :, :]
