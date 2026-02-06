# ZK Privacy Service Dockerfile
FROM node:20-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Run setup script
RUN node setup.js

# Expose port (if needed for future API)
EXPOSE 8080

# Default command
CMD ["node", "zk_bridge.js"]
