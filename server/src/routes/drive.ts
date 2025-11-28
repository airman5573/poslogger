import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../auth.js";

const router = Router();

const STORAGE_DIR = process.env.STORAGE_DIR || path.resolve(process.cwd(), "storage");

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, STORAGE_DIR);
  },
  filename: (_req, file, cb) => {
    // Use original filename, sanitize it
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

type FileInfo = {
  name: string;
  size: number;
  modifiedAt: string;
};

// GET /api/drive - List files
router.get("/", requireAuth, (_req, res) => {
  try {
    const files = fs.readdirSync(STORAGE_DIR);
    const fileList: FileInfo[] = files
      .filter((file) => !file.startsWith("."))
      .map((file) => {
        const filePath = path.join(STORAGE_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return res.json({ files: fileList });
  } catch (err) {
    console.error("Error listing files:", err);
    return res.status(500).json({ error: "Failed to list files" });
  }
});

// GET /api/drive/:filename - Download file
router.get("/:filename", requireAuth, (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(STORAGE_DIR, filename);

  // Prevent directory traversal
  if (!filePath.startsWith(STORAGE_DIR)) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  return res.download(filePath, filename);
});

// POST /api/drive - Upload file
router.post("/", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  return res.json({
    success: true,
    file: {
      name: req.file.filename,
      size: req.file.size,
      modifiedAt: new Date().toISOString(),
    },
  });
});

// DELETE /api/drive/:filename - Delete file
router.delete("/:filename", requireAuth, (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(STORAGE_DIR, filename);

  // Prevent directory traversal
  if (!filePath.startsWith(STORAGE_DIR)) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  try {
    fs.unlinkSync(filePath);
    return res.json({ success: true });
  } catch (err) {
    console.error("Error deleting file:", err);
    return res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
