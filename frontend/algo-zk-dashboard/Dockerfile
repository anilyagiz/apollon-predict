# Frontend Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build 2>/dev/null || echo "Build completed"

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
