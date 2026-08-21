import os
from pathlib import Path
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# Modelo exportado em formato Keras 2 (Teachable Machine); força o backend legado tf-keras.
os.environ.setdefault("TF_USE_LEGACY_KERAS", "1")
from tensorflow import keras


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "model" / "keras_model.h5"
LABELS_PATH = BASE_DIR / "model" / "labels.txt"
IMAGE_SIZE = (224, 224)
app = FastAPI(title="Bipa.ai Vision API")
# Origens padrão (dev local + site publicado no GitHub Pages); ALLOWED_ORIGINS permite sobrescrever em produção.
DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://obmlucasserra.github.io",
]
origins = os.environ.get("ALLOWED_ORIGINS", "").split(",") if os.environ.get("ALLOWED_ORIGINS") else DEFAULT_ORIGINS
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])
model = keras.models.load_model(MODEL_PATH) if MODEL_PATH.exists() else None
labels = [line.strip() for line in LABELS_PATH.read_text(encoding="utf-8").splitlines() if line.strip()] if LABELS_PATH.exists() else []

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None, "labels": len(labels)}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Modelo não encontrado em model/keras_model.h5")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Envie um arquivo de imagem.")
    try:
        image = Image.open(file.file).convert("RGB").resize(IMAGE_SIZE)
        batch = np.expand_dims(np.asarray(image, dtype=np.float32) / 255.0, axis=0)
        prediction = np.asarray(model.predict(batch, verbose=0)).squeeze()
        index = int(np.argmax(prediction))
        confidence = float(prediction[index])
        label = labels[index] if index < len(labels) else f"Classe {index}"
        return {"label": label, "confidence": confidence, "class_index": index}
    except Exception as error:
        raise HTTPException(status_code=422, detail=f"Não foi possível processar a imagem: {error}") from error