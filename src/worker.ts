import { createServer } from "@/server";
import { createHonoApp } from "@/utils/hono-app";

// Create MCP server instance and Hono app
const mcpServer = createServer();
const app = createHonoApp(mcpServer, { includeRuntime: true });

/**
 * Cloudflare Workers fetch handler
 */
export default {
	fetch: app.fetch,
};
