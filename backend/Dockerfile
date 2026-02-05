FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source and public files
COPY . .

# Build TypeScript
RUN npm run build

# Copy public folder to dist
RUN cp -r public dist/ 2>/dev/null || true

# Expose port
EXPOSE 3000

# Start command
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
