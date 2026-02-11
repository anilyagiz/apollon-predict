# Backend API Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML Engine and Data Aggregator
COPY ml-engine /app/ml-engine
COPY data-aggregator /app/data-aggregator
COPY zk-privacy /app/zk-privacy

# Copy API code
COPY api /app/api

# Set Python path
ENV PYTHONPATH=/app:/app/ml-engine:/app/data-aggregator

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the server
CMD ["python", "api/server.py"]
