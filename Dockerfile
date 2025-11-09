# Dockerfile for stdio transport (for Docker-based Claude Desktop integration)
FROM oven/bun:1-alpine

LABEL org.opencontainers.image.title="Traktamente MCP Server (stdio)" \
      org.opencontainers.image.description="MCP server for Swedish traktamente rates via stdio transport" \
      org.opencontainers.image.source="https://github.com/johnie/traktamente-mcp"

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install production dependencies
RUN bun install --production --frozen-lockfile

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Set environment
ENV TRANSPORT=stdio

# Run the server
CMD ["bun", "src/index.ts"]
