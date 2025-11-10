import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { TraktamenteResponse } from "@/utils/schemas";

// Mock got before importing api
const mockJson = mock(() => Promise.resolve({} as TraktamenteResponse));
const mockGet = mock(() => ({
	json: mockJson,
}));

mock.module("got", () => ({
	default: {
		get: mockGet,
	},
}));

// Import after mocking
const { api } = await import("./api");
const { SKATTEVERKET_API_URL } = await import("@/constants");

describe("api", () => {
	beforeEach(() => {
		mockGet.mockClear();
		mockJson.mockClear();
	});

	test("calls got.get with correct URL", async () => {
		mockJson.mockResolvedValueOnce({
			results: [],
			offset: 0,
			limit: 100,
			total: 0,
		});

		await api();

		expect(mockGet).toHaveBeenCalledTimes(1);
		expect(mockGet).toHaveBeenCalledWith(
			SKATTEVERKET_API_URL,
			expect.any(Object),
		);
	});

	test("configures timeout correctly", async () => {
		mockJson.mockResolvedValueOnce({
			results: [],
			offset: 0,
			limit: 100,
			total: 0,
		});

		await api();

		const callArgs = mockGet.mock.calls[0];
		expect(callArgs[1]).toMatchObject({
			timeout: {
				request: 30000,
			},
		});
	});

	test("configures retry correctly", async () => {
		mockJson.mockResolvedValueOnce({
			results: [],
			offset: 0,
			limit: 100,
			total: 0,
		});

		await api();

		const callArgs = mockGet.mock.calls[0];
		expect(callArgs[1]).toMatchObject({
			retry: {
				limit: 2,
				methods: ["GET"],
				statusCodes: [408, 413, 429, 500, 502, 503, 504],
			},
		});
	});

	test("sets correct headers", async () => {
		mockJson.mockResolvedValueOnce({
			results: [],
			offset: 0,
			limit: 100,
			total: 0,
		});

		await api();

		const callArgs = mockGet.mock.calls[0];
		expect(callArgs[1]).toMatchObject({
			headers: {
				"user-agent": "SkatteverketAPI/1.0.0",
				accept: "application/json",
			},
		});
	});

	test("sets responseType to json", async () => {
		mockJson.mockResolvedValueOnce({
			results: [],
			offset: 0,
			limit: 100,
			total: 0,
		});

		await api();

		const callArgs = mockGet.mock.calls[0];
		expect(callArgs[1]).toMatchObject({
			responseType: "json",
		});
	});

	test("passes searchParams when provided", async () => {
		mockJson.mockResolvedValueOnce({
			results: [],
			offset: 0,
			limit: 100,
			total: 0,
		});

		const searchParams = {
			år: "2025",
			_limit: 50,
		};

		await api({ searchParams });

		const callArgs = mockGet.mock.calls[0];
		expect(callArgs[1]).toMatchObject({
			searchParams,
		});
	});

	test("handles multiple search parameters", async () => {
		mockJson.mockResolvedValueOnce({
			results: [],
			offset: 0,
			limit: 100,
			total: 0,
		});

		const searchParams = {
			"land eller område": "Sverige",
			år: "2025",
			_limit: 10,
			_offset: 5,
		};

		await api({ searchParams });

		const callArgs = mockGet.mock.calls[0];
		expect(callArgs[1]).toMatchObject({
			searchParams,
		});
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

		mockJson.mockResolvedValueOnce(mockResponse);

		const result = await api();

		expect(result).toEqual(mockResponse);
		expect(mockJson).toHaveBeenCalledTimes(1);
	});

	test("works without any parameters", async () => {
		mockJson.mockResolvedValueOnce({
			results: [],
			offset: 0,
			limit: 100,
			total: 0,
		});

		await api();

		expect(mockGet).toHaveBeenCalledTimes(1);
		const callArgs = mockGet.mock.calls[0];
		expect(callArgs[1]).toHaveProperty("searchParams");
	});

	test("handles empty searchParams object", async () => {
		mockJson.mockResolvedValueOnce({
			results: [],
			offset: 0,
			limit: 100,
			total: 0,
		});

		await api({ searchParams: {} });

		expect(mockGet).toHaveBeenCalledTimes(1);
		const callArgs = mockGet.mock.calls[0];
		expect(callArgs[1].searchParams).toEqual({});
	});

	test("propagates errors from got", async () => {
		const error = new Error("Network error");
		mockGet.mockImplementationOnce(() => {
			throw error;
		});

		await expect(api()).rejects.toThrow("Network error");
	});

	test("handles API error responses", async () => {
		mockJson.mockRejectedValueOnce(new Error("Invalid response format"));

		await expect(api()).rejects.toThrow("Invalid response format");
	});

	test("handles country code filter", async () => {
		mockJson.mockResolvedValueOnce({
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
		});

		await api({ searchParams: { landskod: "SE" } });

		const callArgs = mockGet.mock.calls[0];
		expect(callArgs[1].searchParams).toMatchObject({
			landskod: "SE",
		});
	});

	test("handles normalbelopp filter", async () => {
		mockJson.mockResolvedValueOnce({
			results: [],
			offset: 0,
			limit: 100,
			total: 0,
		});

		await api({ searchParams: { normalbelopp: "300" } });

		const callArgs = mockGet.mock.calls[0];
		expect(callArgs[1].searchParams).toMatchObject({
			normalbelopp: "300",
		});
	});
});
