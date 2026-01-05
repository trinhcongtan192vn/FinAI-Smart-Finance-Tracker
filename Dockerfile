# ===== Build stage =====
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===== Production stage =====
FROM node:18-alpine
WORKDIR /app

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/.env.production ./

# Install only production dependencies
RUN npm ci --omit=dev

EXPOSE 8080
CMD ["node", "server.js"]
