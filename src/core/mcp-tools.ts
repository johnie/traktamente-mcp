export interface MCPTool {
	name: string;
	description: string;
	inputSchema: {
		type: string;
		properties: Record<string, unknown>;
		required?: string[];
	};
}

export const MCP_TOOLS: MCPTool[] = [
	{
		name: "get_traktamente",
		description:
			"Get traktamente (per diem) rates for countries. Query by country name, year, country code, or amount. Returns normalbelopp (standard amount) in SEK per day.",
		inputSchema: {
			type: "object",
			properties: {
				land: {
					type: "string",
					description:
						'Country or region name (in Swedish, e.g., "Sverige", "Norge", "Tyskland"). Supports regex patterns.',
				},
				år: {
					type: "string",
					description: 'Year (e.g., "2025", "2024")',
				},
				landskod: {
					type: "string",
					description: 'ISO country code (e.g., "SE", "NO", "DE")',
				},
				normalbelopp: {
					type: "string",
					description:
						"Standard amount in SEK. Supports regex for range queries.",
				},
				limit: {
					type: "number",
					description:
						"Maximum number of results to return (1-500, default: 100)",
					default: 100,
				},
				offset: {
					type: "number",
					description: "Offset for pagination (default: 0)",
					default: 0,
				},
			},
		},
	},
	{
		name: "get_all_countries",
		description:
			"Get all available countries with their traktamente rates. Optionally filter by year.",
		inputSchema: {
			type: "object",
			properties: {
				år: {
					type: "string",
					description: 'Year to filter by (e.g., "2025")',
				},
				limit: {
					type: "number",
					description:
						"Maximum number of results to return (1-500, default: 200)",
					default: 200,
				},
			},
		},
	},
	{
		name: "search_traktamente",
		description:
			"Search for traktamente rates by country name using regex patterns. Useful for finding countries when you don't know the exact spelling.",
		inputSchema: {
			type: "object",
			properties: {
				search: {
					type: "string",
					description:
						'Search term or regex pattern (e.g., "Frank" to find France/Frankrike)',
				},
				år: {
					type: "string",
					description: 'Year to filter by (e.g., "2025")',
				},
				limit: {
					type: "number",
					description: "Maximum number of results (1-500, default: 50)",
					default: 50,
				},
			},
			required: ["search"],
		},
	},
];
