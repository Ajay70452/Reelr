# ---- Stage 1: Builder ----
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- Stage 2: Runtime ----
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install runtime system deps (FFmpeg is critical for render workers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY app/ ./app/
COPY run_worker.py .
COPY run_new_migrations.py .
COPY migrations/ ./migrations/

# Create temp directory
RUN mkdir -p /tmp/clipking

# Expose API port
EXPOSE 8000

# Health check for API service
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default: run API server (overridden per service in task definition)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
