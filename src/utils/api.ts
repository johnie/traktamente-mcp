import type { TraktamenteResponse } from "@/utils/schemas";
import { TraktamenteResponseSchema } from "@/utils/schemas";

// API Base URL
const SKATTEVERKET_API_BASE =
	"https://skatteverket.entryscape.net/rowstore/dataset/70ccea31-b64c-4bf5-84c7-673f04f32505";

/**
 * Fetch data from Skatteverket API with optimized error handling
 * Uses Bun's native fetch implementation for maximum performance
 */
export async function fetchTraktamente(params: {
	land?: string;
	år?: string;
	landskod?: string;
	normalbelopp?: string;
	limit?: number;
	offset?: number;
}): Promise<TraktamenteResponse> {
	const searchParams = new URLSearchParams();

	// Build query parameters efficiently
	if (params.land) searchParams.set("land eller område", params.land);
	if (params.år) searchParams.set("år", params.år);
	if (params.landskod) searchParams.set("landskod", params.landskod);
	if (params.normalbelopp)
		searchParams.set("normalbelopp", params.normalbelopp);
	if (params.limit) searchParams.set("_limit", params.limit.toString());
	if (params.offset) searchParams.set("_offset", params.offset.toString());

	const url = `${SKATTEVERKET_API_BASE}${
		searchParams.toString() ? `?${searchParams.toString()}` : ""
	}`;

	try {
		// Bun's native fetch is optimized and faster than Node.js
		const response = await fetch(url, {
			headers: {
				Accept: "application/json",
				"User-Agent": "traktamente-mcp/1.0.0",
			},
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => response.statusText);
			throw new Error(
				`Skatteverket API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
			);
		}

		const data = await response.json();

		// Validate response with Zod schema
		return TraktamenteResponseSchema.parse(data);
	} catch (error) {
		// Enhanced error handling
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Failed to fetch traktamente data: ${String(error)}`);
	}
}
