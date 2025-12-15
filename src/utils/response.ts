import { CHARACTER_LIMIT, ResponseFormat } from "@/constants";
import type { TraktamenteResponse, TraktamenteRow } from "@/utils/schemas";

interface PaginatedResponse {
	[key: string]: unknown;
	total: number;
	count: number;
	offset: number;
	limit: number;
	results: TraktamenteRow[];
	hasMore: boolean;
	nextOffset?: number;
}

/**
 * Transform API response to MCP tool response format with enhanced pagination metadata
 */
export function transformApiResponse(
	data: TraktamenteResponse,
	params: {
		limit?: number;
		offset?: number;
	} = {},
): PaginatedResponse {
	const resultCount = data.results.length;
	const actualLimit = data.limit || params.limit || 100;
	const actualOffset = data.offset || params.offset || 0;
	const total = data.total || resultCount;
	const hasMore = actualOffset + resultCount < total;

	const response: PaginatedResponse = {
		total,
		count: resultCount,
		offset: actualOffset,
		limit: actualLimit,
		results: data.results,
		hasMore,
	};

	// Include next_offset when there are more results
	if (hasMore) {
		response.nextOffset = actualOffset + resultCount;
	}

	return response;
}

/**
 * Format a single traktamente result as markdown
 */
function formatResultAsMarkdown(result: TraktamenteRow): string {
	const country = result["land eller område"];
	const amount = result.normalbelopp;
	const year = result.år;
	const code = result.landskod;

	return `### ${country} (${code})
- **Normalbelopp**: ${amount} SEK/dag
- **År**: ${year}`;
}

/**
 * Format paginated response as markdown
 */
export function formatAsMarkdown(response: PaginatedResponse): string {
	const lines: string[] = [
		"# Traktamente (Per Diem) Rates",
		"",
		`Found ${response.total} result(s), showing ${response.count} (offset: ${response.offset})`,
		"",
	];

	for (const result of response.results) {
		lines.push(formatResultAsMarkdown(result));
		lines.push("");
	}

	if (response.hasMore && response.nextOffset !== undefined) {
		lines.push("---");
		lines.push(
			`*More results available. Use offset=${response.nextOffset} to see next page.*`,
		);
	}

	return lines.join("\n");
}

/**
 * Format response for MCP tool output with support for multiple formats
 * Includes CHARACTER_LIMIT check and truncation
 */
export function formatToolResponse<T extends PaginatedResponse>(
	data: T,
	format: ResponseFormat = ResponseFormat.JSON,
) {
	let textContent: string;

	if (format === ResponseFormat.MARKDOWN) {
		textContent = formatAsMarkdown(data);
	} else {
		textContent = JSON.stringify(data, null, 2);
	}

	// Check character limit and truncate if needed
	if (textContent.length > CHARACTER_LIMIT) {
		const truncatedCount = Math.max(1, Math.floor(data.results.length / 2));
		const truncatedData = {
			...data,
			count: truncatedCount,
			results: data.results.slice(0, truncatedCount),
			truncated: true,
			truncationMessage: `Response truncated from ${data.results.length} to ${truncatedCount} items due to size limits. Use 'offset' parameter or add filters to see more results.`,
		};

		if (format === ResponseFormat.MARKDOWN) {
			textContent = formatAsMarkdown(truncatedData);
			textContent += "\n\n**Note**: Response was truncated due to size limits.";
		} else {
			textContent = JSON.stringify(truncatedData, null, 2);
		}

		return {
			content: [{ type: "text" as const, text: textContent }],
			structuredContent: truncatedData,
		};
	}

	return {
		content: [{ type: "text" as const, text: textContent }],
		structuredContent: data,
	};
}

/**
 * Format a simple search response (without full pagination)
 */
export function formatSearchResponse(
	results: TraktamenteRow[],
	searchTerm: string,
	format: ResponseFormat = ResponseFormat.JSON,
) {
	const response = {
		searchTerm,
		count: results.length,
		results,
	};

	let textContent: string;

	if (format === ResponseFormat.MARKDOWN) {
		const lines = [
			`# Search Results for "${searchTerm}"`,
			"",
			`Found ${results.length} matching result(s)`,
			"",
		];

		for (const result of results) {
			lines.push(formatResultAsMarkdown(result));
			lines.push("");
		}

		textContent = lines.join("\n");
	} else {
		textContent = JSON.stringify(response, null, 2);
	}

	return {
		content: [{ type: "text" as const, text: textContent }],
		structuredContent: response,
	};
}
