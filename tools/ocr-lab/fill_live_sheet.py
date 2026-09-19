"""Fill a backend-generated blank (GET /assignments/{id}/blank.pdf) with synthetic printed answers, for scanning
the sheet from a screen or paper on the phone. Synthetic data only, no student data.
Usage: fill_live_sheet.py <assignment-id> [--name РАХМАТУЛЛИНТИМУР] [--wrong Q:INDEX:LETTER ...]   (inputs from ../sheet-gen/out/live/)
Output: ../sheet-gen/out/live/<id>-filled.png and .pdf (git-ignored)."""
import json
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import e2e_desktop as e

LIVE = pathlib.Path(__file__).parents[1] / "sheet-gen/out/live"
FONT = next((pathlib.Path(__file__).parents[2] / "node_modules/.pnpm").glob(
    "@expo-google-fonts+onest@*/node_modules/@expo-google-fonts/onest/700Bold/Onest_700Bold.ttf"))


def main():
    tid = sys.argv[1]
    wrong = {}
    name_text = ""
    args = sys.argv[2:]
    while args:
        a = args.pop(0)
        if a == "--name":
            name_text = args.pop(0)
        else:
            q, i, ch = a.split(":")
            wrong[(int(q), int(i))] = ch
    bundle = json.load(open(LIVE / f"{tid}.bundle.json"))
    questions = bundle["variants"][0]["questions"]
    rect = e.rectify(e.rasterize(LIVE / f"{tid}-v1.pdf", 300))
    if rect is None:
        sys.exit("rectify failed: corner markers not found in the PDF")
    name_boxes, rows = e.extract_cells(rect)
    by_marker = dict(rows)
    img = Image.fromarray(cv2.cvtColor(rect, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(FONT), 68)
    for ch, (x, y, w, h) in zip(name_text, name_boxes):
        draw.text((x + w / 2, y + h / 2 + 2), ch, font=font, fill=(35, 35, 45), anchor="mm")
    for q in questions:
        boxes = by_marker.get(q["marker_id"])
        if not boxes:
            print(f"Q{q['question_number']}: row not found"); continue
        for cell in q["expected_cells"]:
            ch = wrong.get((q["question_number"], cell["index"]), cell["char"])
            if ch.strip() == "" or cell["index"] >= len(boxes):
                continue
            x, y, w, h = boxes[cell["index"]]
            draw.text((x + w / 2, y + h / 2 + 2), ch, font=font, fill=(35, 35, 45), anchor="mm")
        print(f"Q{q['question_number']}: {q['expected_answer']} -> {len(boxes)} cells detected, {q['cell_count']} expected")
    png = LIVE / f"{tid}-filled.png"
    img.save(png)
    img.convert("RGB").save(LIVE / f"{tid}-filled.pdf", resolution=254)
    print(png)


main()
