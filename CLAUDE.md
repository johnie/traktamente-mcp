# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides access to Swedish traktamente (per diem) rates from Skatteverket's official API. The server exposes three tools for querying per diem rates by country, year, country code, or search patterns.

## Runtime and Dependencies

This project uses **Bun** as its runtime (not Node.js). All commands should use Bun:

- Run files: `bun <file>` (not `node` or `ts-node`)
- Install dependencies: `bun install` (not `npm install`)
- Run scripts: `bun run <script>` (not `npm run`)
- Build: `bun build <file>` (not `webpack` or `esbuild`)
- Test: `bun test` (not `jest` or `vitest`)

## Common Commands

### Development
```bash
# Start the server (stdio transport)
bun start

# Start with HTTP transport
bun run start:http

# Development with hot reload
bun dev

# Build for production
bun run build

# Test with MCP Inspector (interactive web UI)
bun run inspector

# Run tests
bun test

# Run a single test file
bun test src/lib/api.test.ts

# Run tests in watch mode
bun test:watch

# Lint and format code
bun run lint
bun run lint:fix   # Auto-fix lint issues
bun run format

# Cloudflare Workers deployment
bun run workers:dev      # Local development with wrangler
bun run workers:deploy   # Deploy to Cloudflare Workers
bun run workers:tail     # View live logs
```

## Architecture

### Modular Structure
The codebase is organized into separate modules for maintainability:

```
src/
├── index.ts              # Entry point - transport selection
├── server.ts             # Core MCP server setup and tool definitions
├── worker.ts             # Cloudflare Workers entry point
├── constants.ts          # Constants (API URL, CHARACTER_LIMIT, ResponseFormat)
├── config.ts             # App name, version, description
├── lib/
│   ├── api.ts            # Skatteverket API client
│   └── api.test.ts       # API tests
├── transports/
│   ├── stdio.ts          # Stdio transport (default)
│   └── http.ts           # HTTP transport (alternative)
└── utils/
    ├── schemas.ts        # Zod schemas for API validation
    ├── http-schemas.ts   # Zod schemas for HTTP/MCP requests
    ├── response.ts       # Response transformation helpers
    └── hono-app.ts       # Hono app factory with MCP endpoints
```

### Key Components

1. **Entry Point** (`src/index.ts`):
   - Transport selection via `TRANSPORT` env var or CLI args
   - Supports both stdio and HTTP transports
   - Default: stdio (for Claude Desktop integration)

2. **Server Core** (`src/server.ts`):
   - MCP server instance with three tools
   - Request handlers for `ListTools` and `CallTool`
   - Tool definitions with input schemas
   - Error handling and response formatting

3. **API Client** (`src/lib/api.ts`):
   - `api()` function for Skatteverket API
   - Custom `fetchWithRetry` wrapper with retry and timeout logic
   - Zod validation of API responses (via schemas)
   - Query parameter building with search params

4. **Transports**:
   - `stdio.ts`: Standard I/O for Claude Desktop
   - `http.ts`: HTTP server for web-based clients using Hono framework

5. **Workers Entry** (`src/worker.ts`):
   - Cloudflare Workers deployment entry point
   - Uses Hono framework with `@hono/mcp` StreamableHTTPTransport
   - Includes health check and MCP endpoints

### Key Technical Details

- **Transport**: Supports both stdio and HTTP, configurable via environment
- **Validation**: Zod schemas validate all API responses before returning
- **Error Handling**: All tool calls wrapped in try-catch, errors returned as MCP error responses
- **API Patterns**: Supports regex patterns in `land` and `normalbelopp` parameters
- **Path Aliases**: Uses `@/` alias for imports (configured in tsconfig.json)

### MCP Tools

The server exposes three tools via the Model Context Protocol. All tools follow the MCP best practice of using a service prefix (`traktamente_`) to avoid naming conflicts with other MCP servers.

1. **`traktamente_get_rates`** - Main query tool with filters:
   - `land` (string, optional): Country name (Swedish) or regex pattern
   - `år` (string, optional): Year (e.g., "2025")
   - `landskod` (string, optional): ISO country code (e.g., "SE", "NO")
   - `normalbelopp` (string, optional): Amount in SEK, supports regex
   - `limit` (number, optional): Max results (1-500, default: 100)
   - `offset` (number, optional): Pagination offset (default: 0)
   - `response_format` ('json' | 'markdown', optional): Output format (default: 'json')

2. **`traktamente_list_countries`** - List all available countries:
   - `år` (string, optional): Filter by year
   - `limit` (number, optional): Max results (1-500, default: 200)
   - `response_format` ('json' | 'markdown', optional): Output format (default: 'json')

3. **`traktamente_search`** - Search countries by pattern:
   - `search` (string, required): Search term or regex pattern
   - `år` (string, optional): Filter by year
   - `limit` (number, optional): Max results (1-500, default: 50)
   - `response_format` ('json' | 'markdown', optional): Output format (default: 'json')

### Tool Features

- **Annotations**: All tools include MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`)
- **Response Formats**: Support both JSON (structured data) and Markdown (human-readable)
- **Enhanced Pagination**: Responses include `total`, `count`, `hasMore`, and `nextOffset` fields
- **Character Limit**: Large responses are automatically truncated at 25,000 characters with clear messaging

### Data Source

- API: `https://skatteverket.entryscape.net/rowstore/dataset/70ccea31-b64c-4bf5-84c7-673f04f32505`
- Returns data with Swedish field names: `land eller område`, `normalbelopp`, `år`, `landskod`
- Supports pagination via `_limit` and `_offset` query params

## Integration

### Claude Desktop Configuration

To use this server with Claude Desktop, add to:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

**For published package (recommended):**
```json
{
  "mcpServers": {
    "traktamente": {
      "command": "npx",
      "args": ["traktamente-mcp"]
    }
  }
}
```

**For local development:**
```json
{
  "mcpServers": {
    "traktamente": {
      "command": "bun",
      "args": ["src/index.ts"],
      "cwd": "/absolute/path/to/traktamente-mcp"
    }
  }
}
```

## Development Notes

- Bun automatically loads `.env` files - don't use dotenv
- Prefer `Bun.file` over `node:fs` for file operations
- The shebang `#!/usr/bin/env bun` in src/index.ts makes it executable
- All API responses include pagination info (`hasMore` field indicates more results available)
- Swedish language is used in country names and some field names from the API
