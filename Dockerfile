# Serving image (Hugging Face Spaces runs it on port 7860).
FROM python:3.14-slim

# LightGBM needs OpenMP at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 app
WORKDIR /home/app
COPY requirements.txt .
RUN grep -E "^(numpy|pandas|pyarrow|lightgbm|fastapi|uvicorn)==" requirements.txt > serve.txt \
    && pip install --no-cache-dir -r serve.txt

COPY --chown=app app.py ./
COPY --chown=app fraud/ fraud/
COPY --chown=app models/ models/
COPY --chown=app static/ static/
USER app

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
