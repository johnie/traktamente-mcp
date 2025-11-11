import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { TraktamenteResponse } from "@/utils/schemas";

// Create a mock fetch function
const mockFetch = mock(
	(): Promise<Response> =>
		Promise.resolve({
			ok: true,
			status: 200,
			json: () => Promise.resolve({} as TraktamenteResponse),
		} as Response),
);

// Mock global fetch
global.fetch = mockFetch;

// Import after mocking
const { api } = await import("./api");
const { SKATTEVERKET_API_URL } = await import("@/constants");

describe("api", () => {
	beforeEach(() => {
		mockFetch.mockClear();
	});

	test("calls fetch with correct URL and no params", async () => {
		const mockResponse: TraktamenteResponse = {
			results: [],
			offset: 0,
			limit: 100,
			total: 0,
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(mockResponse),
		} as Response);

		await api();

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const callUrl = mockFetch.mock.calls[0][0] as string;
		expect(callUrl).toContain(SKATTEVERKET_API_URL);
	});

	test("sets correct headers", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({ results: [], offset: 0, limit: 100, total: 0 }),
		} as Response);

		await api();

		const callOptions = mockFetch.mock.calls[0][1] as RequestInit;
		expect(callOptions.headers).toMatchObject({
			"user-agent": "SkatteverketAPI/1.0.0",
			accept: "application/json",
		});
	});

	test("passes searchParams when provided", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({ results: [], offset: 0, limit: 100, total: 0 }),
		} as Response);

		const searchParams = {
			år: "2025",
			_limit: 50,
		};

		await api({ searchParams });

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const callUrl = mockFetch.mock.calls[0][0] as string;
		// URL encoding converts år to %C3%A5r
		expect(callUrl).toContain("%C3%A5r=2025");
		expect(callUrl).toContain("_limit=50");
	});

	test("handles multiple search parameters", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({ results: [], offset: 0, limit: 100, total: 0 }),
		} as Response);

		const searchParams = {
			"land eller område": "Sverige",
			år: "2025",
			_limit: 10,
			_offset: 5,
		};

		await api({ searchParams });

		const callUrl = mockFetch.mock.calls[0][0] as string;
		// URL encoding: spaces can be + or %20, å becomes %C3%A5
		expect(callUrl).toMatch(/land(\+|%20)eller(\+|%20)omr%C3%A5de=Sverige/);
		expect(callUrl).toContain("%C3%A5r=2025");
		expect(callUrl).toContain("_limit=10");
		expect(callUrl).toContain("_offset=5");
	});

	test("returns parsed JSON response", async () => {
		const mockResponse: TraktamenteResponse = {
			results: [
				{
					"land eller område": "Sverige",
					normalbelopp: "300",
					år: "2025",
					landskod: "SE",
				},
			],
			offset: 0,
			limit: 100,
			total: 1,
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(mockResponse),
		} as Response);

		const result = await api();

		expect(result).toEqual(mockResponse);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	test("works without any parameters", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({ results: [], offset: 0, limit: 100, total: 0 }),
		} as Response);

		await api();

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const callUrl = mockFetch.mock.calls[0][0] as string;
		expect(callUrl).toBe(SKATTEVERKET_API_URL);
	});

	test("handles empty searchParams object", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({ results: [], offset: 0, limit: 100, total: 0 }),
		} as Response);

		await api({ searchParams: {} });

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const callUrl = mockFetch.mock.calls[0][0] as string;
		expect(callUrl).toBe(SKATTEVERKET_API_URL);
	});

	test("handles country code filter", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({
					results: [
						{
							"land eller område": "Sverige",
							normalbelopp: "300",
							år: "2025",
							landskod: "SE",
						},
					],
					offset: 0,
					limit: 100,
					total: 1,
				}),
		} as Response);

		await api({ searchParams: { landskod: "SE" } });

		const callUrl = mockFetch.mock.calls[0][0] as string;
		expect(callUrl).toContain("landskod=SE");
	});

	test("handles normalbelopp filter", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({ results: [], offset: 0, limit: 100, total: 0 }),
		} as Response);

		await api({ searchParams: { normalbelopp: "300" } });

		const callUrl = mockFetch.mock.calls[0][0] as string;
		expect(callUrl).toContain("normalbelopp=300");
	});

	test("propagates errors from fetch", async () => {
		const error = new Error("Network error");
		// Mock all retries to fail with the same error
		mockFetch.mockRejectedValue(error);

		await expect(api()).rejects.toThrow("Network error");
	});

	test("handles HTTP error responses", async () => {
		// Mock all retries to fail with same status
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500,
		} as Response);

		await expect(api()).rejects.toThrow("HTTP error! status: 500");
	});

	test("retries on retryable status codes", async () => {
		// First call returns 503, second call succeeds
		mockFetch
			.mockResolvedValueOnce({
				ok: false,
				status: 503,
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () =>
					Promise.resolve({ results: [], offset: 0, limit: 100, total: 0 }),
			} as Response);

		await api();

		// Should have been called twice (initial + 1 retry)
		expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
	});

	test("filters out undefined and null search params", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({ results: [], offset: 0, limit: 100, total: 0 }),
		} as Response);

		await api({
			searchParams: {
				år: "2025",
				landskod: undefined,
				_limit: null as unknown as number,
			},
		});

		const callUrl = mockFetch.mock.calls[0][0] as string;
		expect(callUrl).toContain("%C3%A5r=2025");
		expect(callUrl).not.toContain("landskod");
		expect(callUrl).not.toContain("_limit");
	});

	test("uses AbortController for timeout", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({ results: [], offset: 0, limit: 100, total: 0 }),
		} as Response);

		await api();

		const callOptions = mockFetch.mock.calls[0][1] as RequestInit;
		expect(callOptions.signal).toBeInstanceOf(AbortSignal);
	});
});
