import "./load-env.js";
import express from "express";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.js";
import logsRouter from "./routes/logs.js";
import driveRouter from "./routes/drive.js";
import { scheduleLogCleanup } from "./db.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 6666;
const maxBodyBytes = process.env.MAX_BODY_BYTES ? Number(process.env.MAX_BODY_BYTES) : 1_000_000;
const staticDir = process.env.CLIENT_DIST || path.resolve(__dirname, "../client-dist");

// Allow every origin/header/method, and short-circuit OPTIONS so preflight never fails
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    req.header("Access-Control-Request-Headers") || "*"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(cookieParser());
app.use(express.json({ limit: maxBodyBytes }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/logs", logsRouter);
app.use("/api/drive", driveRouter);

if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error", err);
  res.status(500).json({ error: "Internal server error" });
});

scheduleLogCleanup();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`External logger listening on port ${PORT}`);
});
