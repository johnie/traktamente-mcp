import { StreamableHTTPTransport } from "@hono/mcp";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createServer } from "@/server";
import { MCPRequestSchema } from "@/utils/http-schemas";

// Create MCP server instance
const mcpServer = createServer();

// Create Hono app
const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["POST", "GET", "OPTIONS"],
		allowHeaders: ["Content-Type"],
	}),
);

// Root endpoint - API info
app.get("/", (c) => {
	return c.json({
		name: "Traktamente MCP Server",
		version: "1.0.0",
		description:
			"MCP server for Swedish traktamente (per diem) rates from Skatteverket",
		runtime: "Cloudflare Workers",
		endpoints: {
			health: "/health (GET)",
			mcp: "/mcp (POST - JSON-RPC 2.0)",
		},
		repository: "https://github.com/johnie/traktamente-mcp",
	});
});

// Health check endpoint
app.get("/health", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// MCP endpoint - delegate to transport
app.post(
	"/mcp",
	zValidator("json", MCPRequestSchema, (result, c) => {
		if (!result.success) {
			return c.json(
				{
					jsonrpc: "2.0",
					id: null,
					error: {
						code: -32600,
						message: "Invalid Request",
						data: result.error.issues,
					},
				},
				400,
			);
		}
	}),
	async (c) => {
		try {
			// Create transport for this request
			const transport = new StreamableHTTPTransport();
			await mcpServer.connect(transport);

			// Handle request through @hono/mcp transport
			return transport.handleRequest(c);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			return c.json({ error: errorMessage }, 500);
		}
	},
);

/**
 * Cloudflare Workers fetch handler
 */
export default {
	fetch: app.fetch,
};
