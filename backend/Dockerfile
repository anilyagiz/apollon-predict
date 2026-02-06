# Backend API Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || true

# Copy backend modules
COPY ml-engine/ /app/ml-engine/
COPY data-aggregator/ /app/data-aggregator/
COPY zk-privacy/ /app/zk-privacy/

# Copy API code
COPY api/ /app/api/

# Set environment variables
ENV PYTHONPATH=/app:/app/ml-engine:/app/data-aggregator
ENV API_HOST=0.0.0.0
ENV API_PORT=8000

# Expose port
EXPOSE 8000

# Run the server
WORKDIR /app/api
CMD ["python", "server.py"]
