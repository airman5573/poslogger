import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { InsertLog, LogRecord, ScenarioSummary } from "./types.js";

const DB_PATH = process.env.SQLITE_DB || "./logs/logs.db";

const ensureDbDir = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDbDir();
const db = new Database(DB_PATH);

const ensureScenarioColumn = () => {
  const columns = db
    .prepare("PRAGMA table_info(logs)")
    .all() as { name: string }[];
  const hasScenarioId = columns.some((col) => col.name === "scenario_id");
  if (!hasScenarioId) {
    db.exec("ALTER TABLE logs ADD COLUMN scenario_id TEXT;");
  }
};

const initSchema = () => {
  db.exec(
    `
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      label TEXT NOT NULL,
      message TEXT NOT NULL,
      context TEXT,
      timestamp TEXT NOT NULL,
      source TEXT,
      scenario_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `
  );

  ensureScenarioColumn();

  db.exec(
    `
    CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
    CREATE INDEX IF NOT EXISTS idx_logs_label ON logs(label);
    CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_logs_scenario_id ON logs(scenario_id);
  `
  );
};

initSchema();

export const insertLog = (payload: InsertLog): number => {
  const stmt = db.prepare(
    `
      INSERT INTO logs (
        level, label, message, context, timestamp, source, scenario_id
      ) VALUES (
        @level, @label, @message, @context, @timestamp, @source, @scenario_id
      )
    `
  );

  const context =
    payload.context === undefined
      ? null
      : typeof payload.context === "string"
        ? payload.context
        : JSON.stringify(payload.context);

  const timestamp = payload.timestamp || new Date().toISOString();

  const info = stmt.run({
    level: payload.level,
    label: payload.label,
    message: payload.message,
    context,
    timestamp,
    source: payload.source || null,
    scenario_id: payload.scenarioId || null,
  });

  return Number(info.lastInsertRowid);
};

type ListParams = {
  levels?: string[];
  labels?: string[];
  sources?: string[];
  start?: string;
  end?: string;
  q?: string;
  limit: number;
  offset: number;
  sinceId?: number;
  scenarioId?: string;
};

export const listLogs = (params: ListParams): { items: LogRecord[]; hasMore: boolean } => {
  const where: string[] = [];
  const bind: Record<string, unknown> = {};

  if (params.levels?.length) {
    where.push(`level IN (${params.levels.map((_, i) => `@lvl${i}`).join(",")})`);
    params.levels.forEach((lvl, i) => (bind[`lvl${i}`] = lvl));
  }
  if (params.labels?.length) {
    where.push(
      `label IN (${params.labels.map((_, i) => `@lbl${i}`).join(",")})`
    );
    params.labels.forEach((lbl, i) => (bind[`lbl${i}`] = lbl));
  }
  if (params.sources?.length) {
    where.push(
      `source IN (${params.sources.map((_, i) => `@src${i}`).join(",")})`
    );
    params.sources.forEach((src, i) => (bind[`src${i}`] = src));
  }
  if (params.start) {
    where.push("timestamp >= @start");
    bind.start = params.start;
  }
  if (params.end) {
    where.push("timestamp <= @end");
    bind.end = params.end;
  }
  if (params.q) {
    where.push("(message LIKE @q OR context LIKE @q)");
    bind.q = `%${params.q}%`;
  }
  if (params.sinceId) {
    where.push("id > @sinceId");
    bind.sinceId = params.sinceId;
  }
  if (params.scenarioId) {
    where.push("scenario_id = @scenarioId");
    bind.scenarioId = params.scenarioId;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limitWithBuffer = params.limit + 1;
  const stmt = db.prepare(
    `
      SELECT id, level, label, message, context, timestamp, source, scenario_id, created_at
      FROM logs
      ${whereSql}
      ORDER BY timestamp DESC
      LIMIT @limit OFFSET @offset
    `
  );

  const rows = stmt.all({
    limit: limitWithBuffer,
    offset: params.offset,
    ...bind,
  }) as LogRecord[];

  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;
  return { items, hasMore };
};

export const deleteLogById = (id: number): boolean => {
  const info = db.prepare("DELETE FROM logs WHERE id = ?").run(id);
  return info.changes > 0;
};

export const deleteAllLogs = (): number => {
  const info = db.prepare("DELETE FROM logs").run();
  return info.changes;
};

export const listScenarios = (limit: number): ScenarioSummary[] => {
  const rows = db
    .prepare(
      `
        SELECT
          scenario_id as scenarioId,
          COUNT(*) as logCount,
          MIN(timestamp) as firstLogAt,
          MAX(timestamp) as lastLogAt,
          GROUP_CONCAT(DISTINCT level) as levels
        FROM logs
        WHERE scenario_id IS NOT NULL
        GROUP BY scenario_id
        ORDER BY lastLogAt DESC
        LIMIT @limit
      `
    )
    .all({ limit }) as {
    scenarioId: string;
    logCount: number;
    firstLogAt: string;
    lastLogAt: string;
    levels: string | null;
  }[];

  return rows.map((row) => ({
    scenarioId: row.scenarioId,
    logCount: Number(row.logCount),
    firstLogAt: row.firstLogAt,
    lastLogAt: row.lastLogAt,
    levels: row.levels
      ? Array.from(new Set(row.levels.split(",").filter(Boolean)))
      : [],
  }));
};

export const deleteOldLogs = (daysOld: number = 30): number => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const stmt = db.prepare(
    `
      DELETE FROM logs
      WHERE created_at < @cutoff
    `
  );

  const info = stmt.run({ cutoff: cutoffDate.toISOString() });
  return info.changes;
};

export const scheduleLogCleanup = (daysOld: number = 30) => {
  const oneDayMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    const deleted = deleteOldLogs(daysOld);
    console.error(`[Cleanup] Deleted ${deleted} old log entries`);
  }, oneDayMs);
};
