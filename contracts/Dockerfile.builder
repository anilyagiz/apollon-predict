# NEAR Contract Builder and Deployer
FROM rust:1.86-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install wasm target
RUN rustup target add wasm32-unknown-unknown

# Install NEAR CLI
RUN npm install -g near-cli@latest

# Install near-cli-rs as fallback
RUN cargo install near-cli-rs 2>/dev/null || echo "near-cli-rs optional"

# Set working directory
WORKDIR /contracts

# Default command
CMD ["bash"]
