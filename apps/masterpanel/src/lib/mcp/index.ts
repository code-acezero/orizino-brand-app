import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";

export default defineMcp({
  name: "orizino-masterpanel-mcp",
  title: "Orizino Masterpanel",
  version: "0.1.0",
  instructions:
    "MCP server for the Orizino Masterpanel admin app. Use `echo` to verify connectivity. Additional admin tools can be added on request.",
  tools: [echoTool],
});
// code:4ce0
