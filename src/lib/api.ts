import got from "got";
import { SKATTEVERKET_API_URL } from "@/constants";
import {
	type TraktamenteQueryParams,
	TraktamenteResponseSchema,
} from "@/utils/schemas";

export const api = async ({
	searchParams,
}: {
	searchParams?: TraktamenteQueryParams;
} = {}) => {
	const response = await got
		.get(SKATTEVERKET_API_URL, {
			searchParams,
			responseType: "json",
			timeout: {
				request: 30000,
			},
			retry: {
				limit: 2,
				methods: ["GET"],
				statusCodes: [408, 413, 429, 500, 502, 503, 504],
			},
			headers: {
				"user-agent": "SkatteverketAPI/1.0.0",
				accept: "application/json",
			},
		})
		.json();

	// Validate response with Zod schema
	return TraktamenteResponseSchema.parse(response);
};
