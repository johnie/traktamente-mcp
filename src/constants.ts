export const SKATTEVERKET_API_URL =
	"https://skatteverket.entryscape.net/rowstore/dataset/70ccea31-b64c-4bf5-84c7-673f04f32505";

/**
 * Maximum response size in characters to prevent overwhelming responses
 */
export const CHARACTER_LIMIT = 25_000;

/**
 * Response format options for tool outputs
 */
export const ResponseFormat = {
	JSON: "json",
	MARKDOWN: "markdown",
} as const;

export type ResponseFormat =
	(typeof ResponseFormat)[keyof typeof ResponseFormat];
