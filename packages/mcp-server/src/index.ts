#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { registerCheckBalanceTool } from "./tools/check-balance.js";
import { registerPayX402Tool } from "./tools/pay-x402.js";

dotenv.config();

const server = new McpServer({
  name: "web3ads-x402",
  version: "1.0.0",
});

// Register tools
registerCheckBalanceTool(server);
registerPayX402Tool(server);

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[web3ads-mcp] Server started on stdio");
}

main().catch((err) => {
  console.error("[web3ads-mcp] Fatal error:", err);
  process.exit(1);
});
