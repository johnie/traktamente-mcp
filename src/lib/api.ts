import got from "got";
import { SKATTEVERKET_API_URL } from "@/constants";
import type {
	TraktamenteQueryParams,
	TraktamenteResponse,
} from "@/utils/schemas";

export const api = async ({
	searchParams,
}: {
	searchParams?: TraktamenteQueryParams;
} = {}) => {
	return got
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
		.json<TraktamenteResponse>();
};
