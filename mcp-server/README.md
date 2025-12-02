# poslog-mcp-server

MCP server for querying the external log server by scenario ID.

## Setup

1. Install dependencies and build:
   ```bash
   cd mcp-server
   npm install
   npm run build
   ```
2. Provide environment variables:
   - `LOG_SERVER_URL` (default: `http://localhost:6666/api`)
   - `LOG_SERVER_API_KEY` (required)

## Running with an MCP client

Add a server entry to your MCP client configuration (example `mcp.json`):
```json
{
  "mcpServers": {
    "poslog": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "mcp-server",
      "env": {
        "LOG_SERVER_URL": "http://localhost:6666/api",
        "LOG_SERVER_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

### Tools
- `get_logs`: scenarioId (required), limit (default 100, max 500), level (optional).
- `list_scenarios`: limit (default 20, max 100).
