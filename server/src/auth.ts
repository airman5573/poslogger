import { CookieOptions, NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const AUTH_PASSWORD =
  process.env.VIEWER_PASSWORD || process.env.AUTH_PASSWORD || process.env.LOG_VIEW_PASSWORD;
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required for auth");
  }
  return secret;
})();
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "poslog_auth";
const parsedTtl = Number(process.env.AUTH_TTL_SECONDS);
const DEFAULT_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const TOKEN_TTL_SECONDS = Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : DEFAULT_TOKEN_TTL_SECONDS;

if (!AUTH_PASSWORD) {
  throw new Error("AUTH_PASSWORD (or VIEWER_PASSWORD / LOG_VIEW_PASSWORD) is required for auth");
}

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const authCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: TOKEN_TTL_SECONDS * 1000,
};

type AuthTokenPayload = {
  purpose: "log-viewer";
  iat?: number;
  exp?: number;
};

export const getAuthCookieName = () => COOKIE_NAME;
export const getAuthTtlMs = () => TOKEN_TTL_SECONDS * 1000;

const verifyToken = (token: string) => jwt.verify(token, JWT_SECRET) as AuthTokenPayload;

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = verifyToken(token);
    if (payload.purpose !== "log-viewer") throw new Error("Invalid token purpose");
    return next();
  } catch (err) {
    res.clearCookie(COOKIE_NAME, baseCookieOptions);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function issueAuth(res: Response) {
  const token = jwt.sign({ purpose: "log-viewer" }, JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });

  res.cookie(COOKIE_NAME, token, authCookieOptions);
  return token;
}

export function isPasswordValid(password: string) {
  return password === AUTH_PASSWORD;
}

export function readAuthStatus(req: Request) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return { authenticated: false };

  try {
    const payload = verifyToken(token);
    if (payload.purpose !== "log-viewer") throw new Error("Invalid token purpose");
    return {
      authenticated: true,
      expiresAt: payload.exp ? payload.exp * 1000 : undefined,
    } as const;
  } catch (err) {
    return { authenticated: false } as const;
  }
}

export function clearAuth(res: Response) {
  res.clearCookie(COOKIE_NAME, baseCookieOptions);
}
