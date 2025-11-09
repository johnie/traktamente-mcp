import { z } from "zod";

// Zod schemas for validation
export const TraktamenteResultSchema = z.object({
	"land eller område": z.string(),
	normalbelopp: z.string(),
	år: z.string(),
	landskod: z.string(),
});

export const TraktamenteResponseSchema = z.object({
	next: z.string().optional(),
	resultCount: z.number(),
	offset: z.number(),
	limit: z.number(),
	queryTime: z.number(),
	results: z.array(TraktamenteResultSchema),
});

export type TraktamenteResult = z.infer<typeof TraktamenteResultSchema>;
export type TraktamenteResponse = z.infer<typeof TraktamenteResponseSchema>;
