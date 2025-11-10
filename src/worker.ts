import { MCP_TOOLS } from "@/core/mcp-tools";
import { api } from "@/lib/api";
import type { TraktamenteQueryParams } from "@/utils/schemas";

interface MCPRequest {
	jsonrpc: "2.0";
	id: string | number;
	method: string;
	params?: {
		name?: string;
		arguments?: Record<string, unknown>;
	};
}

interface MCPResponse {
	jsonrpc: "2.0";
	id: string | number;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

/**
 * Handle MCP protocol requests
 */
async function handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
	const { id, method, params } = request;

	try {
		// Handle tools/list method
		if (method === "tools/list") {
			return {
				jsonrpc: "2.0",
				id,
				result: {
					tools: MCP_TOOLS,
				},
			};
		}

		// Handle tools/call method
		if (method === "tools/call") {
			if (!params?.name) {
				return {
					jsonrpc: "2.0",
					id,
					error: {
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
					},
				},
			};
		}

		// Unknown method
		return {
			jsonrpc: "2.0",
			id,
			error: {
				code: -32601,
				message: `Unknown method: ${method}`,
			},
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			jsonrpc: "2.0",
			id,
			error: {
				code: -32603,
				message: "Internal error",
				data: errorMessage,
			},
		};
	}
}

/**
 * Cloudflare Workers fetch handler
 */
export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// CORS headers
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: corsHeaders,
			});
		}

		// Health check endpoint
		if (url.pathname === "/health") {
			return Response.json(
				{ status: "ok", timestamp: new Date().toISOString() },
				{ headers: corsHeaders },
			);
		}

		// MCP endpoint
		if (url.pathname === "/mcp" && request.method === "POST") {
			try {
				const body = (await request.json()) as MCPRequest;

				// Validate JSON-RPC 2.0 format
				if (body.jsonrpc !== "2.0" || !body.method) {
					return Response.json(
						{
							jsonrpc: "2.0",
							id: body.id || null,
							error: {
								code: -32600,
								message: "Invalid Request",
							},
						},
						{
							status: 400,
							headers: { ...corsHeaders, "Content-Type": "application/json" },
						},
					);
				}

				const response = await handleMCPRequest(body);

				return Response.json(response, {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				return Response.json(
					{
						jsonrpc: "2.0",
						id: null,
						error: {
							code: -32700,
							message: "Parse error",
							data: errorMessage,
						},
					},
					{
						status: 400,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					},
				);
			}
		}

		// Root endpoint with API info
		if (url.pathname === "/") {
			return Response.json(
				{
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
				},
				{ headers: corsHeaders },
			);
		}

		// Not found
		return new Response("Not Found", {
			status: 404,
			headers: corsHeaders,
		});
	},
};
