FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy all files
COPY . .

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript (includes copying public to dist)
RUN npm run build

# Expose port
ENV PORT=3000
EXPOSE 3000

# Just start the server - db push will be done separately
CMD ["node", "dist/index.js"]
