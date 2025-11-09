# Traktamente MCP Server

An MCP server that provides access to Swedish traktamente (per diem) rates from Skatteverket's official API.

## Features

- 🔍 Query per diem rates by country, year, or country code
- 🌍 Search across all available countries
- 📊 Access official data from Skatteverket
- ⚡ Fast and lightweight implementation using Bun
- 🔒 Type-safe with Zod schema validation

## Installation

```bash
pnpm install traktamente-mcp
```

Or with Bun:

```bash
bun add traktamente-mcp
```

## Usage

### With Claude Desktop

Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

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

Restart Claude Desktop, and you'll have access to three new tools:

- **get_traktamente** - Query per diem rates with filters (country, year, country code)
- **get_all_countries** - List all available countries
- **search_traktamente** - Search for countries using regex patterns

### Standalone Usage

```bash
# Start the server
bun start

# Development mode with hot reload
bun dev

# Test with MCP Inspector (interactive web UI)
bun run inspector
```

### With Docker

The server can run in a Docker container, useful for isolated environments or deployment:

```bash
# Build the Docker image
docker build -t traktamente-mcp .

# Run with stdio transport (interactive)
docker run -i traktamente-mcp

# Or use Docker Compose
docker-compose up
```

#### Docker with Claude Desktop

To use the Docker container with Claude Desktop, configure it like this:

**macOS/Linux**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "traktamente": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "traktamente-mcp"]
    }
  }
}
```

**Note**: You need to build the Docker image first using `docker build -t traktamente-mcp .` in the project directory.

## Available Tools

### `get_traktamente`

Query traktamente rates with optional filters:

- `land` (string, optional): Country name or regex pattern
- `år` (string, optional): Year
- `landskod` (string, optional): Country code (e.g., "US", "GB")
- `limit` (number, optional): Maximum number of results (default: 100)
- `offset` (number, optional): Pagination offset (default: 0)

### `get_all_countries`

List all countries with available per diem data. No parameters required.

### `search_traktamente`

Search for countries using a regex pattern:

- `search` (string, required): Search term or regex pattern
- `limit` (number, optional): Maximum number of results (default: 50)

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.0.0 or later)

### Setup

```bash
# Clone the repository
git clone https://github.com/johnie/traktamente-mcp.git
cd traktamente-mcp

# Install dependencies
bun install

# Start development server
bun dev
```

### Testing with MCP Inspector

The MCP Inspector provides an interactive web UI for testing the server:

```bash
bun run inspector
```

This will open a browser where you can test all available tools and see real-time responses.

## Data Source

This server fetches data from Skatteverket's official API:
- **API URL**: https://skatteverket.entryscape.net/rowstore/dataset/70ccea31-b64c-4bf5-84c7-673f04f32505
- **Data**: Per diem rates for international travel
- **Language**: Swedish (country names and field names)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use Bun for all commands (not Node.js or npm)
- Follow the existing code style (enforced by Biome)
- Add tests for new features
- Update documentation as needed

## License

MIT © [Johnie Hjelm](https://github.com/johnie)

## Support

- **Issues**: [GitHub Issues](https://github.com/johnie/traktamente-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/johnie/traktamente-mcp/discussions)

## Acknowledgments

- Data provided by [Skatteverket](https://www.skatteverket.se)
- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Powered by [Bun](https://bun.sh)
