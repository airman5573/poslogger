import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const envSchema = z.object({
  LOG_SERVER_URL: z.string().url().default("http://localhost:6666/api"),
  LOG_SERVER_API_KEY: z.string().min(1, "LOG_SERVER_API_KEY is required"),
});

const envResult = envSchema.safeParse({
  LOG_SERVER_URL: process.env.LOG_SERVER_URL,
  LOG_SERVER_API_KEY: process.env.LOG_SERVER_API_KEY,
});

if (!envResult.success) {
  console.error("Invalid environment configuration:", envResult.error.flatten().fieldErrors);
  process.exit(1);
}

const env = envResult.data;
const apiBase = env.LOG_SERVER_URL.endsWith("/")
  ? env.LOG_SERVER_URL
  : `${env.LOG_SERVER_URL}/`;

type ApiLogRecord = {
  id: number;
  level: string;
  label: string;
  message: string;
  context: string | null;
  timestamp: string;
  source: string | null;
  scenario_id: string | null;
};

type LogListResponse = {
  items: ApiLogRecord[];
  nextCursor?: string;
  hasMore?: boolean;
};

type ScenarioSummary = {
  scenarioId: string;
  logCount: number;
  firstLogAt: string;
  lastLogAt: string;
  levels: string[];
};

type ScenarioListResponse = {
  scenarios: ScenarioSummary[];
};

const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const url = new URL(path, apiBase);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
};

const apiFetch = async <T>(url: URL): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-API-Key": env.LOG_SERVER_API_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Request to ${url.pathname} failed (${res.status}): ${text || res.statusText}`
    );
  }

  return (await res.json()) as T;
};

const formatContext = (context: string | null) => {
  if (!context) return undefined;
  try {
    const parsed = JSON.parse(context);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return context;
  }
};

const formatLogs = (scenarioId: string, response: LogListResponse, limit: number) => {
  if (!response.items.length) {
    return `No logs found for scenario "${scenarioId}".`;
  }

  const lines = response.items.map((log) => {
    const headerParts = [
      `[${log.timestamp}]`,
      `[${log.level}]`,
      log.label ? `[${log.label}]` : undefined,
      log.message,
    ].filter(Boolean);

    const meta: string[] = [];
    if (log.source) meta.push(`source=${log.source}`);
    if (log.scenario_id) meta.push(`scenario=${log.scenario_id}`);
    const metaText = meta.length ? ` (${meta.join(", ")})` : "";

    const contextText = formatContext(log.context);
    if (contextText) {
      return `${headerParts.join(" ")}${metaText}\n  context: ${contextText}`;
    }
    return `${headerParts.join(" ")}${metaText}`;
  });

  if (response.hasMore) {
    lines.push(`More logs available (limit=${limit}, hasMore=true).`);
  }

  return `Scenario: ${scenarioId}\n${lines.join("\n")}`;
};

const formatScenarioList = (scenarios: ScenarioSummary[], limit: number) => {
  if (!scenarios.length) {
    return "No scenarios found.";
  }

  const lines = scenarios.map((scenario, index) => {
    const levels = scenario.levels.length ? scenario.levels.join(", ") : "n/a";
    return `${index + 1}. ${scenario.scenarioId} - ${scenario.logCount} logs - ${scenario.firstLogAt} -> ${scenario.lastLogAt} - levels: ${levels}`;
  });

  return `Showing up to ${limit} recent scenarios:\n${lines.join("\n")}`;
};

const clampLimit = (value: number | undefined, fallback: number, max: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), 1), max);
};

const normalizeLevel = (level?: string) => {
  if (!level) return undefined;
  return level.toUpperCase();
};

const server = new McpServer({
  name: "poslog-mcp",
  version: "1.0.0",
});

server.registerTool(
  "get_logs",
  {
    title: "Get Logs",
    description: "Fetch logs by scenarioId.",
    inputSchema: {
      scenarioId: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[A-Za-z0-9_-]+$/)
        .describe("Scenario ID to query (required)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of logs to return (default 100, max 500)"),
      level: z
        .string()
        .optional()
        .describe("Optional log level filter (DEBUG, INFO, WARN, ERROR)"),
    },
  },
  async ({ scenarioId, limit, level }) => {
    const limitValue = clampLimit(limit, 100, 500);
    const normalizedLevel = normalizeLevel(level);

    const url = buildUrl("logs", {
      scenarioId,
      limit: limitValue,
      level: normalizedLevel,
    });

    try {
      const response = await apiFetch<LogListResponse>(url);
      const text = formatLogs(scenarioId, response, limitValue);
      return {
        content: [{ type: "text", text }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("get_logs failed", error);
      return {
        content: [{ type: "text", text: `Failed to fetch logs: ${message}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "list_scenarios",
  {
    title: "List Scenarios",
    description: "List recent scenarios with counts and timestamps.",
    inputSchema: {
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum scenarios to return (default 20, max 100)"),
    },
  },
  async ({ limit }) => {
    const limitValue = clampLimit(limit, 20, 100);
    const url = buildUrl("logs/scenarios", { limit: limitValue });

    try {
      const response = await apiFetch<ScenarioListResponse>(url);
      const text = formatScenarioList(response.scenarios, limitValue);
      return {
        content: [{ type: "text", text }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("list_scenarios failed", error);
      return {
        content: [{ type: "text", text: `Failed to list scenarios: ${message}` }],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();

try {
  await server.connect(transport);
  console.error(`poslog-mcp server ready (base=${apiBase})`);
} catch (err) {
  console.error("Failed to start MCP server", err);
  process.exit(1);
}
