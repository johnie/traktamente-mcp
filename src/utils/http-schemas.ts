import { z } from "zod";

export const MCPRequestSchema = z.object({
	jsonrpc: z.literal("2.0"),
	id: z.union([z.string(), z.number(), z.null()]).optional(),
	method: z.string(),
	params: z.unknown().optional(),
});

export type MCPRequest = z.infer<typeof MCPRequestSchema>;
