# ==============================================================================
# Praman Rakshak: Smart Digital Evidence Management System (SDMS)
# Multi-Stage Production Dockerfile
# ==============================================================================

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY backend/frontend/package*.json ./
RUN npm ci

COPY backend/frontend/ ./
RUN npm run build

# Stage 2: Production Python/Django Environment
FROM python:3.11-slim

# System dependencies for PostgreSQL, Tesseract OCR, and PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    tesseract-ocr \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/ ./

# Copy built frontend assets into frontend/dist for Django/WhiteNoise to serve
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set environment variables for production
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    DEBUG=False

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose server port
EXPOSE 8000

# Run with Daphne ASGI Server supporting WebSockets and HTTP
CMD ["sh", "-c", "python manage.py migrate --noinput && daphne -b 0.0.0.0 -p ${PORT:-8000} config.asgi:application"]
