import { createServer } from "@/server";
import { createHonoApp } from "@/utils/hono-app";

export function startHttpServer() {
	const mcpServer = createServer();
	const port = Number.parseInt(process.env.PORT || "3000", 10);
	const host = process.env.HOST || "0.0.0.0";

	// Create Hono app with shared configuration
	const app = createHonoApp(mcpServer);

	// Start server with Bun
	Bun.serve({
		port,
		hostname: host,
		fetch: app.fetch,
	});

	console.error(`Traktamente MCP Server running on http://${host}:${port}`);
	console.error(`MCP endpoint: http://${host}:${port}/mcp`);
	console.error(`Health check: http://${host}:${port}/health`);
}
