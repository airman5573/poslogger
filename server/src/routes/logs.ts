import { Router, Request, Response } from "express";
import { z } from "zod";
import { deleteAllLogs, deleteLogById, insertLog, listLogs } from "../db.js";

const router = Router();

const timestampSchema = z.preprocess(
  (val: unknown) => (val === null || val === "" ? undefined : val),
  z.string().datetime().optional()
);

const logSchema = z.object({
  level: z.string().min(1),
  label: z.string().min(1),
  message: z.string().min(1),
  context: z.any().optional(),
  // Accept missing/empty/null timestamp; server will default to now().
  timestamp: timestampSchema,
  source: z.string().optional(),
});

const listSchema = z.object({
  level: z.string().optional(),
  label: z.string().optional(),
  source: z.string().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  q: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v: string | undefined) => (v ? Number(v) : 200))
    .pipe(z.number().int().min(1).max(1000)),
  offset: z
    .string()
    .optional()
    .transform((v: string | undefined) => (v ? Number(v) : 0))
    .pipe(z.number().int().min(0)),
  cursor: z.string().optional(),
  since_id: z.string().optional(),
});

router.post("/", (req: Request, res: Response) => {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  try {
    const id = insertLog(parsed.data);
    return res.status(201).json({ id });
  } catch (err) {
    console.error("insertLog error", err);
    return res.status(500).json({ error: "Failed to insert log" });
  }
});

router.get("/", (req: Request, res: Response) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  const { level, label, source, start, end, q, limit, offset, cursor, since_id } =
    parsed.data;

  const levels = level ? level.split(",").filter(Boolean) : undefined;
  const labels = label ? label.split(",").filter(Boolean) : undefined;
  const sources = source ? source.split(",").filter(Boolean) : undefined;
  const sinceId = cursor ? Number(cursor) : since_id ? Number(since_id) : undefined;

  try {
    const items = listLogs({
      levels,
      labels,
      sources,
      start,
      end,
      q,
      limit,
      offset,
      sinceId,
    });

    const nextCursor = items.length ? String(items[items.length - 1].id) : undefined;
    return res.json({ items, nextCursor });
  } catch (err) {
    console.error("listLogs error", err);
    return res.status(500).json({ error: "Failed to fetch logs" });
  }
});

router.delete("/", (_req: Request, res: Response) => {
  try {
    const deleted = deleteAllLogs();
    return res.status(200).json({ deleted });
  } catch (err) {
    console.error("deleteAllLogs error", err);
    return res.status(500).json({ error: "Failed to delete logs" });
  }
});

router.delete("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const deleted = deleteLogById(id);
    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("deleteLog error", err);
    return res.status(500).json({ error: "Failed to delete log" });
  }
});

export default router;
