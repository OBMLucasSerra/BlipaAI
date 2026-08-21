FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/
COPY model/ model/

ENV TF_USE_LEGACY_KERAS=1
# Hugging Face Spaces expects the container to listen on port 7860.
EXPOSE 7860

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
