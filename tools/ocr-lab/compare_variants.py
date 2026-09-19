"""Compare the older guide preprocessing with the authors' source-exact one on synthetic printed cells.
Synthetic printed letters only: NOT handwriting accuracy."""
import json, pathlib
import cv2, numpy as np, onnxruntime as ort
from preprocess import preprocess_cell
from preprocess_server import preprocess_cell_server

ROOT = pathlib.Path(__file__).parent
G = json.loads((ROOT / "fixtures/golden.json").read_text())
MODELS = pathlib.Path("~/Downloads/iMe Desktop").expanduser()
sess = {n: ort.InferenceSession(str(MODELS / f"tatar_ocr_uppercase39_{n}.onnx"), providers=["CPUExecutionProvider"]) for n in ("fp32", "int8")}
cells = [cv2.imread(str(ROOT / "fixtures/cells" / f)) for f in G["files"]]
labels = np.array(G["labels"])
print(f"{'pipeline':44s} {'fp32':>6s} {'int8':>6s} {'mean top-1 p':>13s}")
for name, fn in (("older guide (trim 4%, square pad)", lambda c: preprocess_cell(c)),
                 ("authors' source (classify_cell)", lambda c: preprocess_cell_server(c))):
    batch = np.stack([fn(c)[1][0] for c in cells])
    row = []
    for n, s in sess.items():
        lg = s.run(None, {"input": batch})[0]
        p = np.exp(lg - lg.max(1, keepdims=True)); p /= p.sum(1, keepdims=True)
        row.append(((lg.argmax(1) == labels).mean(), p.max(1).mean()))
    print(f"{name:44s} {row[0][0]:6.3f} {row[1][0]:6.3f} {row[0][1]:13.3f}")
