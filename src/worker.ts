<<<<<<< HEAD
import { MCP_TOOLS } from "@/core/mcp-tools";
import { api } from "@/lib/api";
import type { TraktamenteQueryParams } from "@/utils/schemas";
=======
import { StreamableHTTPTransport } from "@hono/mcp";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createServer } from "@/server";
import { MCPRequestSchema } from "@/utils/http-schemas";
>>>>>>> 0ee0c53 (refactor: streamline MCP request handling by integrating Hono framework and removing legacy code)

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
<<<<<<< HEAD
						code: -32602,
						message: "Invalid params: 'name' is required",
					},
				};
			}

			const { name, arguments: args = {} } = params;

			// Handle get_traktamente tool
			if (name === "get_traktamente") {
				const searchParams = args as TraktamenteQueryParams;

				const data = await api({ searchParams });

				return {
					jsonrpc: "2.0",
					id,
					result: {
						content: [
							{
								type: "text",
								text: JSON.stringify(data, null, 2),
							},
						],
					},
				};
			}

			// Handle get_all_countries tool
			if (name === "get_all_countries") {
				const queryParams = args as TraktamenteQueryParams;

				const data = await api({
					searchParams: {
						år: queryParams.år,
						_limit: queryParams._limit || 200,
					},
				});

				return {
					jsonrpc: "2.0",
					id,
					result: {
						content: [
							{
								type: "text",
								text: JSON.stringify(data, null, 2),
							},
						],
					},
				};
			}

			// Handle search_traktamente tool
			if (name === "search_traktamente") {
				const queryParams = args as {
					search: string;
					år?: string;
					limit?: number;
				};

				if (!queryParams.search) {
					return {
						jsonrpc: "2.0",
						id,
						error: {
							code: -32602,
							message: "Invalid params: 'search' is required",
						},
					};
				}

				const data = await api({
					searchParams: {
						"land eller område": queryParams.search,
						år: queryParams.år,
						_limit: queryParams.limit || 50,
					},
				});

				return {
					jsonrpc: "2.0",
					id,
					result: {
						content: [
							{
								type: "text",
								text: JSON.stringify(data, null, 2),
							},
						],
					},
				};
			}

			// Unknown tool
			return {
				jsonrpc: "2.0",
				id,
				error: {
					code: -32601,
					message: `Unknown tool: ${name}`,
				},
			};
		}

		// Handle initialize method (MCP handshake)
		if (method === "initialize") {
			return {
				jsonrpc: "2.0",
				id,
				result: {
					protocolVersion: "2024-11-05",
					capabilities: {
						tools: {},
					},
					serverInfo: {
						name: "traktamente-mcp",
						version: "1.0.0",
=======
						code: -32600,
						message: "Invalid Request",
						data: result.error.issues,
>>>>>>> 0ee0c53 (refactor: streamline MCP request handling by integrating Hono framework and removing legacy code)
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
