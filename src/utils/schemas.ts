import { z } from "zod";

/**
 * Query parameters schema for the dataset endpoint
 * Dataset: Normalbelopp (Travel allowances from Swedish Tax Agency)
 */
export const TraktamenteQueryParamsSchema = z.object({
	/**
	 * Filter by country or region (Swedish: "land eller område")
	 * Supports regular expressions
	 */
	"land eller område": z.string().optional(),

	/**
	 * Filter by normal amount (Swedish: "normalbelopp")
	 * Supports regular expressions
	 */
	normalbelopp: z.string().optional(),

	/**
	 * Filter by year (Swedish: "år")
	 * Supports regular expressions
	 */
	år: z.string().optional(),

	/**
	 * Filter by country code (Swedish: "landskod")
	 * Supports regular expressions
	 */
	landskod: z.string().optional(),

	/**
	 * Size of the result window
	 * Range: 1-500, Default: 100
	 */
	_limit: z.coerce.number().int().min(1).max(500).default(100).optional(),

	/**
	 * Offset for pagination (results, not pages)
	 * Example: page 3 with limit=50 would be offset=100
	 */
	_offset: z.coerce.number().int().min(0).default(0).optional(),
});

/**
 * Individual dataset row schema
 */
export const TraktamenteRowSchema = z.object({
	"land eller område": z.string(),
	normalbelopp: z.union([z.string(), z.number()]),
	år: z.union([z.string(), z.number()]),
	landskod: z.string(),
});

/**
 * Response schema for successful queries
 */
export const TraktamenteResponseSchema = z.object({
	results: z.array(TraktamenteRowSchema),
	offset: z.number().optional(),
	limit: z.number().optional(),
	total: z.number().optional(),
});

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
	error: z.string().optional(),
	message: z.string().optional(),
	statusCode: z.number(),
	code: z.string().optional(),
});

/**
 * Type exports
 */
export type TraktamenteQueryParams = z.infer<
	typeof TraktamenteQueryParamsSchema
>;
export type TraktamenteRow = z.infer<typeof TraktamenteRowSchema>;
export type TraktamenteResponse = z.infer<typeof TraktamenteResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
