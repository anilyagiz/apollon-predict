# Frontend Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start in dev mode, bind to 0.0.0.0 so Docker port forwarding works
CMD ["npx", "next", "dev", "--turbopack", "--hostname", "0.0.0.0"]
