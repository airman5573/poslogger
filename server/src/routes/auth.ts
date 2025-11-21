import { Router } from "express";
import { clearAuth, getAuthTtlMs, isPasswordValid, issueAuth, readAuthStatus } from "../auth.js";

const router = Router();

router.post("/login", (req, res) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string") {
    return res.status(400).json({ error: "Password is required" });
  }

  if (!isPasswordValid(password)) {
    return res.status(401).json({ error: "Invalid password" });
  }

  issueAuth(res);
  return res.json({ authenticated: true, expiresAt: Date.now() + getAuthTtlMs() });
});

router.get("/status", (req, res) => {
  const status = readAuthStatus(req);

  if (!status.authenticated) {
    clearAuth(res);
    return res.json({ authenticated: false });
  }

  return res.json(status);
});

router.post("/logout", (_req, res) => {
  clearAuth(res);
  return res.json({ authenticated: false });
});

router.post("/refresh", (req, res) => {
  const status = readAuthStatus(req);

  if (!status.authenticated) {
    clearAuth(res);
    return res.status(401).json({ authenticated: false });
  }

  issueAuth(res);
  return res.json({ authenticated: true, expiresAt: Date.now() + getAuthTtlMs() });
});

export default router;
