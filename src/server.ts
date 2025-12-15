import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { APP_NAME, APP_VERSION } from "@/config";
import { ResponseFormat } from "@/constants";
import { api } from "@/lib/api";
import {
	formatSearchResponse,
	formatToolResponse,
	transformApiResponse,
} from "@/utils/response";
import { TraktamenteRowSchema } from "@/utils/schemas";

// Shared response format schema
const responseFormatSchema = z
	.nativeEnum(ResponseFormat)
	.default(ResponseFormat.JSON)
	.describe(
		"Output format: 'json' for structured data (default), 'markdown' for human-readable text",
	);

// Input schemas with .strict() to forbid extra fields
const getTraktamenteInputSchema = z
	.object({
		land: z
			.string()
			.optional()
			.describe(
				'Country or region name in Swedish (e.g., "Sverige", "Norge", "Tyskland"). Supports regex patterns for partial matching.',
			),
		år: z
			.string()
			.optional()
			.describe('Year to filter by (e.g., "2025", "2024")'),
		landskod: z
			.string()
			.optional()
			.describe('ISO 3166-1 alpha-2 country code (e.g., "SE", "NO", "DE")'),
		normalbelopp: z
			.string()
			.optional()
			.describe(
				'Standard daily allowance amount in SEK. Supports regex for range queries (e.g., "^3" for amounts starting with 3).',
			),
		limit: z
			.number()
			.int()
			.min(1)
			.max(500)
			.default(100)
			.describe("Maximum number of results to return (1-500, default: 100)"),
		offset: z
			.number()
			.int()
			.min(0)
			.default(0)
			.describe("Number of results to skip for pagination (default: 0)"),
		response_format: responseFormatSchema,
	})
	.strict();

const getTraktamenteOutputSchema = z.object({
	total: z.number().describe("Total number of matching results"),
	count: z.number().describe("Number of results in this response"),
	offset: z.number().describe("Current pagination offset"),
	limit: z.number().describe("Maximum results per page"),
	results: z.array(TraktamenteRowSchema),
	hasMore: z.boolean().describe("Whether more results are available"),
	nextOffset: z
		.number()
		.optional()
		.describe("Offset value for the next page (if hasMore is true)"),
});

const getAllCountriesInputSchema = z
	.object({
		år: z.string().optional().describe('Year to filter by (e.g., "2025")'),
		limit: z
			.number()
			.int()
			.min(1)
			.max(500)
			.default(200)
			.describe("Maximum number of results to return (1-500, default: 200)"),
		response_format: responseFormatSchema,
	})
	.strict();

const getAllCountriesOutputSchema = z.object({
	total: z.number(),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	results: z.array(TraktamenteRowSchema),
	hasMore: z.boolean(),
	nextOffset: z.number().optional(),
});

const searchTraktamenteInputSchema = z
	.object({
		search: z
			.string()
			.min(1, "Search term is required")
			.describe(
				'Search term or regex pattern for country names (e.g., "Frank" to find France/Frankrike, "^S" for countries starting with S)',
			),
		år: z.string().optional().describe('Year to filter by (e.g., "2025")'),
		limit: z
			.number()
			.int()
			.min(1)
			.max(500)
			.default(50)
			.describe("Maximum number of results (1-500, default: 50)"),
		response_format: responseFormatSchema,
	})
	.strict();

const searchTraktamenteOutputSchema = z.object({
	searchTerm: z.string(),
	count: z.number(),
	results: z.array(TraktamenteRowSchema),
});

/**
 * Handle API errors with actionable messages
 */
function handleApiError(error: unknown, operation: string): never {
	if (error instanceof Error) {
		const message = error.message;

		// Network/timeout errors
		if (message.includes("timeout") || message.includes("abort")) {
			throw new Error(
				`${operation} timed out. The Skatteverket API may be slow. Try again or reduce the limit parameter.`,
			);
		}

		// HTTP errors
		if (message.includes("HTTP error")) {
			const statusMatch = message.match(/status:\s*(\d+)/);
			const status = Number.parseInt(statusMatch?.[1] ?? "0", 10);

			switch (status) {
				case 404:
					throw new Error(
						`${operation} returned no data. Verify the query parameters are valid.`,
					);
				case 429:
					throw new Error(
						`${operation} was rate limited. Please wait before making more requests.`,
					);
				case 500:
				case 502:
				case 503:
					throw new Error(
						`${operation} failed due to a server error. The Skatteverket API may be temporarily unavailable. Try again later.`,
					);
				default:
					throw new Error(`${operation} failed: ${message}`);
			}
		}
	}

	throw new Error(`${operation} failed: ${String(error)}`);
}

// Create and configure the MCP server
export function createServer() {
	const server = new McpServer({
		name: APP_NAME,
		version: APP_VERSION,
	});

	// Register traktamente_get_rates tool
	server.registerTool(
		"traktamente_get_rates",
		{
			title: "Get Traktamente Rates",
			description: `Query Swedish traktamente (per diem) rates from Skatteverket's official database.

This tool retrieves daily travel allowance rates for business trips to different countries. The rates are used by Swedish employers to calculate tax-free per diem payments.

Args:
  - land (string, optional): Country name in Swedish. Supports regex patterns.
  - år (string, optional): Year to filter by (e.g., "2025")
  - landskod (string, optional): ISO country code (e.g., "SE", "NO")
  - normalbelopp (string, optional): Daily rate in SEK. Supports regex.
  - limit (number, optional): Max results (1-500, default: 100)
  - offset (number, optional): Pagination offset (default: 0)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  For JSON format:
  {
    "total": number,        // Total matching results
    "count": number,        // Results in this response
    "offset": number,       // Current offset
    "limit": number,        // Page size
    "results": [
      {
        "land eller område": string,  // Country name (Swedish)
        "normalbelopp": string,       // Daily rate in SEK
        "år": string,                 // Year
        "landskod": string            // ISO country code
      }
    ],
    "hasMore": boolean,     // More results available
    "nextOffset": number    // Offset for next page (if hasMore)
  }

Examples:
  - Get Sweden's rate: { "landskod": "SE", "år": "2025" }
  - Get Nordic countries: { "land": "Norge|Danmark|Finland", "år": "2025" }
  - Paginate results: { "limit": 20, "offset": 20 }

Note: Country names are in Swedish (e.g., "Tyskland" for Germany, "Frankrike" for France).`,
			inputSchema: getTraktamenteInputSchema.shape,
			outputSchema: getTraktamenteOutputSchema.shape,
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: true,
			},
		},
		async ({
			land,
			år,
			landskod,
			normalbelopp,
			limit,
			offset,
			response_format,
		}) => {
			try {
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

				const response = transformApiResponse(data, { limit, offset });
				return formatToolResponse(response, response_format);
			} catch (error) {
				handleApiError(error, "Fetching traktamente rates");
			}
		},
	);

	// Register traktamente_list_countries tool
	server.registerTool(
		"traktamente_list_countries",
		{
			title: "List All Countries",
			description: `List all countries with available traktamente (per diem) rates.

This tool retrieves a comprehensive list of all countries for which Skatteverket has published per diem rates. Use this when you need to see all available countries or when you're unsure of the exact country name.

Args:
  - år (string, optional): Filter by year (e.g., "2025")
  - limit (number, optional): Max results (1-500, default: 200)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Same structure as traktamente_get_rates with a list of all countries.

Examples:
  - List all countries for 2025: { "år": "2025" }
  - Get first 50 countries: { "limit": 50 }

Use traktamente_search for fuzzy matching when you don't know the exact Swedish name.`,
			inputSchema: getAllCountriesInputSchema.shape,
			outputSchema: getAllCountriesOutputSchema.shape,
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: true,
			},
		},
		async ({ år, limit, response_format }) => {
			try {
				const data = await api({
					searchParams: {
						år,
						_limit: limit,
					},
				});

				const response = transformApiResponse(data, { limit, offset: 0 });
				return formatToolResponse(response, response_format);
			} catch (error) {
				handleApiError(error, "Fetching country list");
			}
		},
	);

	// Register traktamente_search tool
	server.registerTool(
		"traktamente_search",
		{
			title: "Search Traktamente",
			description: `Search for traktamente rates by country name using pattern matching.

This tool is ideal when you don't know the exact Swedish spelling of a country name. It supports regex patterns for flexible searching.

Args:
  - search (string, required): Search term or regex pattern
  - år (string, optional): Filter by year (e.g., "2025")
  - limit (number, optional): Max results (1-500, default: 50)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  {
    "searchTerm": string,   // The search pattern used
    "count": number,        // Number of matches
    "results": [...]        // Matching traktamente records
  }

Examples:
  - Find France: { "search": "Frank" } → finds "Frankrike"
  - Find Germany: { "search": "Tysk" } → finds "Tyskland"
  - Countries starting with S: { "search": "^S" }
  - Case-insensitive: { "search": "[Ss]pan" } → finds "Spanien"

Tip: Swedish country names often differ from English (Tyskland=Germany, Frankrike=France, Spanien=Spain, Schweiz=Switzerland).`,
			inputSchema: searchTraktamenteInputSchema.shape,
			outputSchema: searchTraktamenteOutputSchema.shape,
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: true,
			},
		},
		async ({ search, år, limit, response_format }) => {
			try {
				const data = await api({
					searchParams: {
						"land eller område": search,
						år,
						_limit: limit,
					},
				});

				return formatSearchResponse(data.results, search, response_format);
			} catch (error) {
				handleApiError(error, "Searching traktamente");
			}
		},
	);

	return server;
}
