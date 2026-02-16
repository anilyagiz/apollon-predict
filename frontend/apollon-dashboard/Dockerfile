# Frontend Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the app - output goes to .next by default
RUN npm run build

# Expose port
EXPOSE 3000

# Start production server
CMD ["node_modules/next/dist/bin/next", "start"]
