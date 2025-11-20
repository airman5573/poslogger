# External Logger Plan

## Goal
- Build a Node.js log collector (Express) that accepts JSON POSTs from PHP/JS clients, stores logs to disk (NDJSON, daily files), keeps a recent in-memory cache, and exposes a polling-friendly GET API.
- Build a React UI (with TanStack Query) that polls the server to display logs with level colors, filtering, and search.

## Architecture
- Single Node service (Express) with endpoints under `/logs`.
- In-memory store holds recent N entries (configurable, e.g., 1000) for fast queries.
- Persistent store: append-only NDJSON files, rotated by date: `logs/YYYY-MM-DD.log`.
- CORS enabled (configurable). Optional light rate limiting.
- Client app served separately (dev server) or via static build proxied by Node (optional).

## Data Model
- LogEntry fields:
  - `id` (uuid)
  - `timestamp` (ISO string, server-generated)
  - `level` (enum: debug, info, warn, error, fatal; default info)
  - `message` (string)
  - `context` (object, optional, size-limited)
  - `source` (string, optional; e.g., service name)
  - `meta` (object, optional; may include request IP)
- Level colors (client): debug=gray, info=blue, warn=orange, error=red, fatal=dark red/purple.

## API
- POST `/logs`
  - Body JSON: `{ level?, message, context?, source? }`
  - Validation: message required (length-limited); level in enum; context size cap; source length cap.
  - Behavior: enrich with id/timestamp/meta; push to memory cache; append to file; respond `202`.
  - Errors: 400 on validation; 500 on write failure.
- GET `/logs`
  - Query params: `level` (comma list), `q` (search in message/context/source), `limit` (default 200, max 1000), `since` (timestamp or id cursor).
  - Behavior: filter in-memory cache; if `since` provided, return newer entries; sorted latest-first.
  - Response: `{ items: LogEntry[], nextSince?: string }` (cursor optional for future incremental fetch).

## Storage
- Directory `logs/` (ensure exists). Each line NDJSON LogEntry.
- Daily rotation by filename; future enhancement: size-based rotation, compression, cleanup.
- `.gitignore` the `logs/` directory.

## Server Behavior
- Express app with JSON body parser and CORS.
- Config via `.env`: `PORT` (default 6666), `LOG_DIR` (default ./logs), `MEM_LIMIT` (default 1000), `CORS_ORIGIN` (default `*`).
- Memory cache: simple array or deque capped at MEM_LIMIT.
- File writes: `fs.appendFile` to current day file; on day change, append to new file.
- Graceful shutdown: stop accepting requests; flush inflight writes (appendFile is immediate; minimal work).
- Optional middleware: small IP-based rate limit (e.g., 100 req/5m) if needed.

## Client (React + TanStack Query)
- Single-page log viewer.
- Features:
  - Filters: level checkboxes, search box (`q`), limit selector, optional poll interval selector, clear filters button.
  - Log list: color badge by level, timestamp, message, source; expandable context JSON viewer; newest first; optional auto-scroll toggle.
  - States: loading/error indicators; empty state.
- Data fetching:
  - `useQuery` with `refetchInterval` (e.g., 2–5s configurable).
  - Builds query params from filters/search; uses `since` when auto-scroll is on to reduce payload (optional incremental).
  - Error handling: toast/snackbar on fetch errors.
- Styling: CSS variables for level colors; responsive layout.

## Helpers (Client Libraries)
- PHP helper (`php/logger.php`):
  - Function `send_log($endpoint, $message, $level='info', $context=[], $source=null)`.
  - Uses cURL POST JSON; no auth; returns success/failure.
- JS helper (`js/logger.js`):
  - Function `sendLog({ endpoint, message, level='info', context={}, source })`.
  - Uses `fetch` POST JSON; suitable for Node or browser.

## Configuration
- `.env.example` with PORT, LOG_DIR, MEM_LIMIT, CORS_ORIGIN, POLL_INTERVAL_MS suggestion for UI.
- `logs/` directory created on startup; ignored in git.

## Testing Plan
- Server unit tests: validation passes/fails correctly; file append called; filtering by level/search works; limit respected.
- Integration tests: POST then GET returns entry; `since` returns only newer items.
- Client tests: component renders list; filters update query params; polling triggers refetch.
- Manual: run server, send sample logs via curl/PHP/JS helper, observe UI updates and file write.

## Security/Resilience
- Input limits: message length, context size, source length; drop oversize payloads with 400.
- CORS restricted via config when needed.
- Fixed log directory to prevent path traversal.
- Lightweight rate limit optional to avoid abuse.
- Handle malformed JSON with Express error handler.

## Work Phases
1) Init project structure: `server/`, `client/`, helpers, configs; add .gitignore and env example.
2) Implement server: config loader, memory store, file writer with daily rotation, POST/GET routes, validation, CORS.
3) Implement client: React + TanStack Query setup, fetch hook, filters/search UI, level badges, context viewer, polling controls.
4) Add helpers: PHP and JS wrappers with usage examples.
5) Docs: README with setup, run scripts, API spec, helper examples, UI usage, future enhancements.
6) Testing: add targeted tests; manual verification with sample log submissions.
