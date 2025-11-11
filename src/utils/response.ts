import type { TraktamenteResponse } from "@/utils/schemas";

/**
 * Transform API response to MCP tool response format with pagination metadata
 */
export function transformApiResponse(
	data: TraktamenteResponse,
	params: {
		limit?: number;
		offset?: number;
		includeOffset?: boolean;
	} = {},
) {
	const resultCount = data.results.length;
	const actualLimit = data.limit || params.limit || 100;
	const actualOffset = data.offset || params.offset || 0;
	const hasMore = data.total
		? actualOffset + resultCount < data.total
		: resultCount === actualLimit;

	const response: {
		resultCount: number;
		results: TraktamenteResponse["results"];
		hasMore: boolean;
		offset?: number;
		limit?: number;
	} = {
		resultCount,
		results: data.results,
		hasMore,
	};

	// Only include offset and limit if requested (for backward compatibility)
	if (params.includeOffset) {
		response.offset = actualOffset;
		response.limit = actualLimit;
	}

	return response;
}

/**
 * Format response for MCP tool output (text + structured content)
 */
export function formatToolResponse<T>(data: T) {
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(data, null, 2),
			},
		],
		structuredContent: data,
	};
}
