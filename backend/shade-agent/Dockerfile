# Apollon Shade Agent - TEE-compatible Docker Image
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npx tsc

# Environment
ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3100/health || exit 1

# Run the agent
CMD ["node", "dist/index.js"]
