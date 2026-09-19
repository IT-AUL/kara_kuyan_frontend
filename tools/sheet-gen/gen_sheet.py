"""Worksheet generator for the OCR spike, reproducing the geometry of the backend's real blank
(DanisGaleev/tatar_ocr, backend/app/generators/pdf_blank.py, commit 796601e). Geometry facts only —
the repository has no licence, so no code is copied. The mobile app must treat this layout as a
versioned template contract (docs/contracts/contract-gaps.md item 15): the offline bundle itself carries
no coordinates; the authors' server hardcodes them in blank_pipeline.py.

Rectified canvas = paper mm x 10 (2100 x 2970 px). Corner marker outer corners land at
(60,60), (2040,60), (60,2910), (2040,2910), i.e. exactly paper mm x 10.

Outputs (tools/sheet-gen/out/, git-ignored):
  sheet_blank.pdf   printable sheet
  sheet_filled.pdf  same sheet with synthetic printed answers (one deliberate error, for pipeline tests)
  layout.json       mm coordinates of markers, QR, name cells and answer cells (origin top-left, y down)
  bundle.json       fixture offline bundle (questions, expected answers, expected_cells)
"""
import io
import json
import pathlib

import cv2
import numpy as np
import qrcode
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "out"
FONT_DIR = next((ROOT.parents[1] / "node_modules/.pnpm").glob("@expo-google-fonts+onest@*/node_modules/@expo-google-fonts/onest"))
MM = 72.0 / 25.4
PAGE_W, PAGE_H = 210.0, 297.0

CORNER_SIZE, CORNER_INSET = 14.0, 6.0
CORNER_IDS = {"tl": 0, "tr": 1, "bl": 2, "br": 3}  # 2 = bottom-left, 3 = bottom-right
CELL = 10.0
ROW_Y0, ROW_PITCH = 38.0, 28.0          # question block origin and pitch
CELLS_X, CELLS_DY = 22.0, 9.5           # answer cells: x, and offset from block origin (single-line prompt)
QMARK_SIZE, QMARK_X, QMARK_DY = 11.0, 6.0, 4.0
QR_SIZE, QR_X, QR_Y = 18.0, 23.0, 6.0
NAME_CELLS, NAME_CELL = 16, 9.0
NAME_X, NAME_Y = QR_X + QR_SIZE + 6.0, 6.0 + 11.5 + 4.2   # 47.0, 21.7

TID = "TAT-2026-Q1"
QUESTIONS = [
    ("Куегыз сүзне юнәлеш килешендә: китап →", "case_dative", "Юнәлеш килеше", "КИТАПКА"),
    ("Куегыз сүзне чыгыш килешендә: өстәл →", "case_ablative", "Чыгыш килеше", "ӨСТӘЛДӘН"),
    ("Сүзгә күплек сан кушымчасын ялгагыз: дус →", "plural_affixes", "Күплек сан", "ДУСЛАР"),
    ("Куегыз сүзне урын-вакыт килешендә: мәктәп →", "case_locative", "Урын-вакыт килеше", "МӘКТӘПТӘ"),
    ("Тартым кушымчасын өстәгез (минем): китап →", "possessive", "Тартым кушымчалары", "КИТАБЫМ"),
    ("Куегыз сүзне юнәлеш килешендә: өй →", "case_dative", "Юнәлеш килеше", "ӨЙГӘ"),
    ("Сүзгә күплек сан кушымчасын ялгагыз: бала →", "plural_affixes", "Күплек сан", "БАЛАЛАР"),
    ("Куегыз сүзне чыгыш килешендә: урман →", "case_ablative", "Чыгыш килеше", "УРМАННАН"),
]
WRONG_ANSWER = {1: "ӨСТӘЛТӘН"}  # index of question -> what the synthetic "student" wrote


def aruco_image(marker_id: int) -> ImageReader:
    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    img = cv2.aruco.generateImageMarker(d, marker_id, 600)
    ok, buf = cv2.imencode(".png", img)
    return ImageReader(io.BytesIO(buf.tobytes()))


def qr_image(payload: str) -> ImageReader:
    img = qrcode.make(payload, border=1, error_correction=qrcode.constants.ERROR_CORRECT_M).convert("L")
    buf = io.BytesIO(); img.save(buf, "PNG"); buf.seek(0)
    return ImageReader(buf)


def build_layout(questions=None, tid=None, title="Татар теле. 7 сыйныф. Исем килешләре"):
    questions = QUESTIONS if questions is None else questions
    tid = TID if tid is None else tid
    c = CORNER_SIZE
    corners = {
        "tl": (CORNER_INSET, CORNER_INSET), "tr": (PAGE_W - CORNER_INSET - c, CORNER_INSET),
        "br": (PAGE_W - CORNER_INSET - c, PAGE_H - CORNER_INSET - c), "bl": (CORNER_INSET, PAGE_H - CORNER_INSET - c),
    }
    layout = {
        "fixture_layout_assumption": True,
        "units": "mm, origin top-left, y down",
        "page": {"format": "A4", "width": PAGE_W, "height": PAGE_H},
        "aruco": {"dictionary": "DICT_4X4_50"},
        "corner_markers": [
            {"corner": k, "id": CORNER_IDS[k], "x": x, "y": y, "size": c} for k, (x, y) in corners.items()
        ],
        "qr": {"x": QR_X, "y": QR_Y, "size": QR_SIZE},
        "name_field": {"x": NAME_X, "y": NAME_Y, "cell": NAME_CELL, "count": NAME_CELLS},
        "cell_size": CELL,
        "questions": [],
    }
    bundle_qs = []
    for i, (prompt, tag, topic, answer) in enumerate(questions):
        n, mid, y = i + 1, 11 + i, ROW_Y0 + i * ROW_PITCH  # y = block origin
        cells = list(answer) + [" "]  # trailing empty cell, as in the API example
        layout["questions"].append({
            "question_number": n, "marker_id": mid, "prompt_y": y + 1.0,
            "marker": {"x": QMARK_X, "y": y + QMARK_DY, "size": QMARK_SIZE},
            "cells": {"x": CELLS_X, "y": y + CELLS_DY, "pitch": CELL, "count": len(cells)},
        })
        bundle_qs.append({
            "question_number": n, "marker_id": mid, "prompt": prompt, "topic_tag": tag, "topic_name_tt": topic,
            "cell_count": len(cells), "expected_answer": answer,
            "expected_cells": [
                {"index": j, "char": ch, **({"is_empty_allowed": True} if ch == " " else {})} for j, ch in enumerate(cells)
            ],
        })
    bundle = {
        "assignment_id": tid, "title": title, "total_variants": 1,
        "variants": [{
            "variant_id": 1,
            "qr_signature": json.dumps({"tid": tid, "var": 1, "page": 1, "tot": 1, "n_q": len(questions)}, separators=(",", ":")),
            "template_geometry": {"format": "A4", "corner_aruco_dict": "DICT_4X4_50", "corner_aruco_ids": [0, 1, 2, 3],
                                   "cell_dimensions_mm": {"width": CELL, "height": CELL}},
            "questions": bundle_qs,
        }],
    }
    return layout, bundle


def draw(path: pathlib.Path, layout, bundle, filled: bool, wrong_answers=None):
    wrong_answers = WRONG_ANSWER if wrong_answers is None else wrong_answers
    pdfmetrics.registerFont(TTFont("Onest", str(FONT_DIR / "500Medium/Onest_500Medium.ttf")))
    pdfmetrics.registerFont(TTFont("OnestB", str(FONT_DIR / "700Bold/Onest_700Bold.ttf")))
    cv = canvas.Canvas(str(path), pagesize=(PAGE_W * MM, PAGE_H * MM))
    Y = lambda y: (PAGE_H - y) * MM  # noqa: E731
    rng = np.random.default_rng(7)

    def image(img, x, y, size):
        cv.drawImage(img, x * MM, Y(y + size), size * MM, size * MM)

    for m in layout["corner_markers"]:
        image(aruco_image(m["id"]), m["x"], m["y"], m["size"])
    q = layout["qr"]
    image(qr_image(bundle["variants"][0]["qr_signature"]), q["x"], q["y"], q["size"])
    cv.setFont("OnestB", 10); cv.drawString(NAME_X * MM, Y(8), "«ДӘРЕСХАНӘ» • " + bundle["title"].upper()[:45])
    cv.setFont("Onest", 7); cv.drawString(NAME_X * MM, Y(13.5), "Җавап бланкы • Вариант 1 • Һәр шакмакка 10×10 мм баш хәреф языгыз")
    cv.setFont("Onest", 7); cv.drawString(NAME_X * MM, Y(19), "Фамилия, исем (укучы коды):")
    cv.setStrokeColorRGB(0, 0, 0); cv.setLineWidth(0.8)
    for i in range(NAME_CELLS):
        cv.rect((NAME_X + i * NAME_CELL) * MM, Y(NAME_Y + NAME_CELL), NAME_CELL * MM, NAME_CELL * MM, stroke=1, fill=0)
    for i, ch in enumerate("ГАЛИЕВ АМИР Р"[:NAME_CELLS] if filled else ""):
        if ch != " ":
            cv.setFont("OnestB", 16); cv.setFillColorRGB(0.05, 0.05, 0.1)
            cv.drawCentredString((NAME_X + i * NAME_CELL + NAME_CELL / 2) * MM, Y(NAME_Y + NAME_CELL / 2 + 2.2), ch)
    cv.setFillColorRGB(0, 0, 0)

    cv.setStrokeColorRGB(0, 0, 0); cv.setLineWidth(0.8)
    for i, lq in enumerate(layout["questions"]):
        bq = bundle["variants"][0]["questions"][i]
        cv.setFont("Onest", 10); cv.setFillColorRGB(0, 0, 0)
        cv.drawString(22 * MM, Y(lq["prompt_y"] + 3), f"{lq['question_number']}) {bq['prompt']}")
        image(aruco_image(lq["marker_id"]), lq["marker"]["x"], lq["marker"]["y"], lq["marker"]["size"])
        cx, cy = lq["cells"]["x"], lq["cells"]["y"]
        written = wrong_answers.get(i, bq["expected_answer"]) if filled else ""
        for j in range(lq["cells"]["count"]):
            x = cx + j * CELL
            cv.rect(x * MM, Y(cy + CELL), CELL * MM, CELL * MM, stroke=1, fill=0)
            if j < len(written):
                cv.setFont("Onest", 20); cv.setFillColorRGB(0.05, 0.05, 0.1)
                dx, dy = rng.uniform(-0.6, 0.6, 2)
                cv.drawCentredString((x + CELL / 2 + dx) * MM, Y(cy + CELL / 2 + 2.6 + dy), written[j])
    cv.showPage(); cv.save()


def main():
    OUT.mkdir(exist_ok=True)
    layout, bundle = build_layout()
    (OUT / "layout.json").write_text(json.dumps(layout, ensure_ascii=False, indent=2))
    (OUT / "bundle.json").write_text(json.dumps(bundle, ensure_ascii=False, indent=2))
    draw(OUT / "sheet_blank.pdf", layout, bundle, filled=False)
    draw(OUT / "sheet_filled.pdf", layout, bundle, filled=True)
    print("wrote", sorted(p.name for p in OUT.iterdir()))


if __name__ == "__main__":
    main()
