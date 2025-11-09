import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "@/server";

export async function startStdioServer() {
	const server = createServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Traktamente MCP Server running on stdio");
}
