#!/usr/bin/env bun
import { startHttpServer } from "@/transports/http";
import { startStdioServer } from "@/transports/stdio";

// Determine transport based on environment variable or CLI arguments
const transport = process.env.TRANSPORT || process.argv[2] || "stdio";

async function main() {
	if (transport === "http") {
		await startHttpServer();
	} else if (transport === "stdio") {
		await startStdioServer();
	} else {
		console.error(`Unknown transport: ${transport}`);
		console.error('Valid options: "stdio" or "http"');
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("Fatal error in main():", error);
	process.exit(1);
});
