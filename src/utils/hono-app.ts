import { StreamableHTTPTransport } from "@hono/mcp";
import { zValidator } from "@hono/zod-validator";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from "@/config";
import { MCPRequestSchema } from "@/utils/http-schemas";

/**
 * Create a configured Hono app with MCP endpoints
 */
export function createHonoApp(mcpServer: McpServer) {
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
		const info: Record<string, unknown> = {
			name: APP_NAME,
			version: APP_VERSION,
			description: APP_DESCRIPTION,
			endpoints: {
				health: "/health (GET)",
				mcp: "/mcp (POST - JSON-RPC 2.0)",
			},
			repository: "https://github.com/johnie/traktamente-mcp",
		};

		return c.json(info);
	});

	// Health check endpoint
	app.get("/health", (c) => {
		const health: Record<string, unknown> = {
			status: "ok",
		};

		return c.json(health);
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

	return app;
}
