import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "@/lib/api";

// Zod schemas for tool inputs and outputs
const getTraktamenteInput = {
	land: z
		.string()
		.optional()
		.describe(
			'Country or region name (in Swedish, e.g., "Sverige", "Norge", "Tyskland"). Supports regex patterns.',
		),
	år: z.string().optional().describe('Year (e.g., "2025", "2024")'),
	landskod: z
		.string()
		.optional()
		.describe('ISO country code (e.g., "SE", "NO", "DE")'),
	normalbelopp: z
		.string()
		.optional()
		.describe("Standard amount in SEK. Supports regex for range queries."),
	limit: z
		.number()
		.min(1)
		.max(500)
		.optional()
		.default(100)
		.describe("Maximum number of results to return (1-500, default: 100)"),
	offset: z
		.number()
		.min(0)
		.optional()
		.default(0)
		.describe("Offset for pagination (default: 0)"),
};

const getTraktamenteOutput = {
	resultCount: z.number(),
	offset: z.number(),
	limit: z.number(),
	results: z.array(z.any()),
	hasMore: z.boolean(),
};

const getAllCountriesInput = {
	år: z.string().optional().describe('Year to filter by (e.g., "2025")'),
	limit: z
		.number()
		.min(1)
		.max(500)
		.optional()
		.default(200)
		.describe("Maximum number of results to return (1-500, default: 200)"),
};

const getAllCountriesOutput = {
	resultCount: z.number(),
	results: z.array(z.any()),
	hasMore: z.boolean(),
};

const searchTraktamenteInput = {
	search: z
		.string()
		.describe(
			'Search term or regex pattern (e.g., "Frank" to find France/Frankrike)',
		),
	år: z.string().optional().describe('Year to filter by (e.g., "2025")'),
	limit: z
		.number()
		.min(1)
		.max(500)
		.optional()
		.default(50)
		.describe("Maximum number of results (1-500, default: 50)"),
};

const searchTraktamenteOutput = {
	resultCount: z.number(),
	results: z.array(z.any()),
};

// Create and configure the MCP server
export function createServer() {
	const server = new McpServer({
		name: "traktamente-mcp",
		version: "1.0.0",
	});

	// Register get_traktamente tool
	server.registerTool(
		"get_traktamente",
		{
			title: "Get Traktamente Rates",
			description:
				"Get traktamente (per diem) rates for countries. Query by country name, year, country code, or amount. Returns normalbelopp (standard amount) in SEK per day.",
			inputSchema: getTraktamenteInput,
			outputSchema: getTraktamenteOutput,
		},
		async ({ land, år, landskod, normalbelopp, limit, offset }) => {
			const data = await api({
				searchParams: {
					"land eller område": land,
					år,
					landskod,
					normalbelopp,
					_limit: limit,
					_offset: offset,
				},
			});

			// Transform API response to match output schema
			const resultCount = data.results.length;
			const actualLimit = data.limit || limit || 100;
			const actualOffset = data.offset || offset || 0;
			const hasMore = data.total
				? actualOffset + resultCount < data.total
				: resultCount === actualLimit;

			const response = {
				resultCount,
				offset: actualOffset,
				limit: actualLimit,
				results: data.results,
				hasMore,
			};

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(response, null, 2),
					},
				],
				structuredContent: response,
			};
		},
	);

	// Register get_all_countries tool
	server.registerTool(
		"get_all_countries",
		{
			title: "Get All Countries",
			description:
				"Get all available countries with their traktamente rates. Optionally filter by year.",
			inputSchema: getAllCountriesInput,
			outputSchema: getAllCountriesOutput,
		},
		async ({ år, limit }) => {
			const data = await api({
				searchParams: {
					år,
					_limit: limit || 200,
				},
			});

			// Transform API response to match output schema
			const resultCount = data.results.length;
			const actualLimit = data.limit || limit || 200;
			const hasMore = data.total
				? (data.offset || 0) + resultCount < data.total
				: resultCount === actualLimit;

			const response = {
				resultCount,
				results: data.results,
				hasMore,
			};

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(response, null, 2),
					},
				],
				structuredContent: response,
			};
		},
	);

	// Register search_traktamente tool
	server.registerTool(
		"search_traktamente",
		{
			title: "Search Traktamente",
			description:
				"Search for traktamente rates by country name using regex patterns. Useful for finding countries when you don't know the exact spelling.",
			inputSchema: searchTraktamenteInput,
			outputSchema: searchTraktamenteOutput,
		},
		async ({ search, år, limit }) => {
			const data = await api({
				searchParams: {
					"land eller område": search,
					år,
					_limit: limit || 50,
				},
			});

			// Transform API response to match output schema
			const response = {
				resultCount: data.results.length,
				results: data.results,
			};

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(response, null, 2),
					},
				],
				structuredContent: response,
			};
		},
	);

	return server;
}
