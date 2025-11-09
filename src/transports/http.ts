import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "@/server";

export async function startHttpServer() {
	const server = createServer();
	const port = parseInt(process.env.PORT || "3000", 10);
	const host = process.env.HOST || "0.0.0.0";

	// Create HTTP transport for MCP
	const transport = new StreamableHTTPServerTransport({
		sessionIdGenerator: () => randomUUID(),
	});

	// Connect server to transport
	await server.connect(transport);

	Bun.serve({
		port,
		hostname: host,
		async fetch(req) {
			const url = new URL(req.url);

			// Health check endpoint
			if (url.pathname === "/health") {
				return new Response(JSON.stringify({ status: "ok" }), {
					headers: { "Content-Type": "application/json" },
				});
			}

			// MCP endpoint - delegate to transport
			if (url.pathname === "/mcp") {
				try {
					// Convert Bun Request to Node.js-like request/response
					const body = await req.text();
					const parsedBody = body ? JSON.parse(body) : undefined;

					// Create a simple response wrapper compatible with Node.js http
					interface ResponseWrapper {
						statusCode: number;
						headers: Record<string, string>;
						body: string;
						setHeader(name: string, value: string): void;
						write(data: string): void;
						end(data?: string): void;
					}

					const responseWrapper: ResponseWrapper = {
						statusCode: 200,
						headers: {},
						body: "",
						setHeader(name: string, value: string) {
							this.headers[name] = value;
						},
						write(data: string) {
							this.body += data;
						},
						end(data?: string) {
							if (data) this.body += data;
						},
					};

					interface RequestLike {
						method: string;
						headers: Record<string, string | string[] | undefined>;
						url: string;
					}

					const requestLike: RequestLike = {
						method: req.method,
						headers: Object.fromEntries(req.headers.entries()),
						url: url.pathname + url.search,
					};

					// Handle request through transport
					await transport.handleRequest(
						requestLike as never,
						responseWrapper as never,
						parsedBody,
					);

					return new Response(responseWrapper.body, {
						status: responseWrapper.statusCode,
						headers: {
							...responseWrapper.headers,
							"Access-Control-Allow-Origin": "*",
							"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
							"Access-Control-Allow-Headers": "Content-Type",
						},
					});
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					return new Response(JSON.stringify({ error: errorMessage }), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}
			}

			// CORS preflight
			if (req.method === "OPTIONS") {
				return new Response(null, {
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type",
					},
				});
			}

			// Root endpoint with API info
			if (url.pathname === "/") {
				return new Response(
					JSON.stringify({
						name: "Traktamente MCP Server",
						version: "1.0.0",
						endpoints: {
							health: "/health",
							mcp: "/mcp (POST)",
						},
					}),
					{
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			return new Response("Not Found", { status: 404 });
		},
	});

	console.error(`Traktamente MCP Server running on http://${host}:${port}`);
	console.error(`MCP endpoint: http://${host}:${port}/mcp`);
	console.error(`Health check: http://${host}:${port}/health`);
}
