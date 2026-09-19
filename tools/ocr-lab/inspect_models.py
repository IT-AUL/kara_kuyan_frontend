"""Inspect the supplied ONNX artifacts: hashes, I/O, opset, op histogram, and a smoke inference."""
import collections
import hashlib
import pathlib
import sys

import numpy as np
import onnx
import onnxruntime as ort

MODEL_DIR = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "~/Downloads/iMe Desktop").expanduser()
FILES = ["tatar_ocr_uppercase39_fp32.onnx", "tatar_ocr_uppercase39_int8.onnx"]

for name in FILES:
    path = MODEL_DIR / name
    data = path.read_bytes()
    print(f"== {name}")
    print("size", len(data), "sha256", hashlib.sha256(data).hexdigest())
    model = onnx.load_from_string(data)
    onnx.checker.check_model(model)
    print("ir_version", model.ir_version, "opset", [(o.domain or "ai.onnx", o.version) for o in model.opset_import])
    print("producer", model.producer_name, model.producer_version)
    for kind, values in (("input", model.graph.input), ("output", model.graph.output)):
        for v in values:
            dims = [d.dim_param or d.dim_value for d in v.type.tensor_type.shape.dim]
            print(kind, v.name, onnx.TensorProto.DataType.Name(v.type.tensor_type.elem_type), dims)
    hist = collections.Counter(n.op_type for n in model.graph.node)
    print("nodes", len(model.graph.node), dict(hist))

    sess = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    for batch in (1, 8, 64):
        x = np.random.default_rng(0).uniform(-1, 1, (batch, 1, 64, 64)).astype(np.float32)
        out = sess.run(None, {sess.get_inputs()[0].name: x})[0]
        print("batch", batch, "->", out.shape, out.dtype)
