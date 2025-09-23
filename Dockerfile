# Multi-stage build for optimized image
FROM node:20-alpine AS dependencies

# Update packages for security
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage  
FROM node:20-alpine AS production

# Update packages and install necessary tools
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache curl dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user with proper permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

WORKDIR /app

# Copy dependencies from previous stage with proper ownership
COPY --from=dependencies --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy application code with proper ownership
COPY --chown=nodeuser:nodejs package*.json ./
COPY --chown=nodeuser:nodejs app.js ./

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Health check with proper timing for Node.js startup
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling in containers
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["npm", "start"]