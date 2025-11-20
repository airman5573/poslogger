import "./load-env.js";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logsRouter from "./routes/logs.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 6666;
const maxBodyBytes = process.env.MAX_BODY_BYTES ? Number(process.env.MAX_BODY_BYTES) : 1_000_000;
const corsOrigin = process.env.CORS_ORIGIN || "*";
const staticDir = process.env.CLIENT_DIST || path.resolve(__dirname, "../client-dist");

app.use(
  cors({
    origin: corsOrigin === "*" ? "*" : corsOrigin.split(","),
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: maxBodyBytes }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/logs", logsRouter);

if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response) => {
  console.error("Unhandled error", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`External logger listening on port ${PORT}`);
});
