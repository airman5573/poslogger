import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { InsertLog, LogRecord } from "./types.js";

const DB_PATH = process.env.SQLITE_DB || "./logs/logs.db";

const ensureDbDir = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDbDir();
const db = new Database(DB_PATH);

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
    CREATE INDEX IF NOT EXISTS idx_logs_label ON logs(label);
    CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
  `
  );
};

initSchema();

export const insertLog = (payload: InsertLog): number => {
  const stmt = db.prepare(
    `
      INSERT INTO logs (
        level, label, message, context, timestamp, source
      ) VALUES (
        @level, @label, @message, @context, @timestamp, @source
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
};

export const listLogs = (params: ListParams): LogRecord[] => {
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

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const stmt = db.prepare(
    `
      SELECT id, level, label, message, context, timestamp, source, created_at
      FROM logs
      ${whereSql}
      ORDER BY timestamp DESC
      LIMIT @limit OFFSET @offset
    `
  );

  const rows = stmt.all({ limit: params.limit, offset: params.offset, ...bind }) as LogRecord[];
  return rows;
};

export const deleteLogById = (id: number): boolean => {
  const info = db.prepare("DELETE FROM logs WHERE id = ?").run(id);
  return info.changes > 0;
};
