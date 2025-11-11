import { SKATTEVERKET_API_URL } from "@/constants";
import {
	type TraktamenteQueryParams,
	TraktamenteResponseSchema,
} from "@/utils/schemas";

/**
 * Fetch API wrapper with retry logic and timeout
 */
async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	retries = 2,
	timeout = 30000,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		// Retry on specific status codes
		const retryableStatusCodes = [408, 413, 429, 500, 502, 503, 504];
		if (retryableStatusCodes.includes(response.status) && retries > 0) {
			// Wait before retrying (exponential backoff)
			await new Promise((resolve) => setTimeout(resolve, (3 - retries) * 1000));
			return fetchWithRetry(url, options, retries - 1, timeout);
		}

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return response;
	} catch (error) {
		clearTimeout(timeoutId);

		// Retry on network errors if retries remaining
		if (retries > 0 && error instanceof Error) {
			// Wait before retrying (exponential backoff)
			await new Promise((resolve) => setTimeout(resolve, (3 - retries) * 1000));
			return fetchWithRetry(url, options, retries - 1, timeout);
		}

		throw error;
	}
}

export const api = async ({
	searchParams,
}: {
	searchParams?: TraktamenteQueryParams;
} = {}) => {
	// Build URL with search params
	const url = new URL(SKATTEVERKET_API_URL);
	if (searchParams) {
		for (const [key, value] of Object.entries(searchParams)) {
			if (value !== undefined && value !== null) {
				url.searchParams.append(key, String(value));
			}
		}
	}

	const response = await fetchWithRetry(url.toString(), {
		method: "GET",
		headers: {
			"user-agent": "SkatteverketAPI/1.0.0",
			accept: "application/json",
		},
	});

	const data = await response.json();

	// Validate response with Zod schema
	return TraktamenteResponseSchema.parse(data);
};
