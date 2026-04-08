# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

# Security: create a non-root user to run the application
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# -------------------------------------------------------------------------
# Install production dependencies only
# -------------------------------------------------------------------------
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# -------------------------------------------------------------------------
# Copy application source
# -------------------------------------------------------------------------
COPY src/ ./src/

# Create logs directory with correct ownership before switching user
RUN mkdir -p logs && chown -R appuser:appgroup /app

# -------------------------------------------------------------------------
# Runtime
# -------------------------------------------------------------------------
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
