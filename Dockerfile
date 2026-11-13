# ==============================================================================
# Multi-Stage Production Dockerfile for Autonomous Outbound SDR Workforce
# Stage 1: Build Frontend (Vite + React 19 + Tailwind CSS)
# Stage 2: Run Backend (FastAPI + LangGraph + Uvicorn)
# ==============================================================================

# --- Stage 1: Build React Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python Production Runtime ---
FROM python:3.10-slim AS runner
WORKDIR /app

# Install system dependencies (curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Copy compiled frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Default port (Render / Railway / Cloud Run injects PORT at runtime)
ENV PORT=8000
EXPOSE 8000

# Healthcheck to ensure API and database checkpointer are responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/scheduler/status || exit 1

# Launch production server
CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT}"]

