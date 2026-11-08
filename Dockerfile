FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    DATABASE_PATH=/data/RequestSystem.db

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN groupadd --system app && \
    useradd --system --gid app app

COPY --chown=app:app src/ ./src/
COPY --chown=app:app db/ ./db/

RUN mkdir -p /data && \
    chown app:app /data

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/docs', timeout=3)" || exit 1

CMD ["sh", "-c", "python db/run_queries.py && exec python -m uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]