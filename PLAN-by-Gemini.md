# External Logger System Plan

## 1. Project Overview
This project aims to build a standalone external logging system. It replaces a Discord Webhook solution with a custom Node.js server that aggregates logs from PHP and JavaScript applications and displays them in a real-time dashboard.

## 2. Technology Stack

### Backend (Server)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Port:** 6666
- **Data Storage:** In-memory array (Circular Buffer) for high performance and simplicity (non-persistent across restarts).
- **Key Libraries:** `cors` (for cross-origin requests), `body-parser`.

### Frontend (Dashboard)
- **Framework:** React (via Vite)
- **State Management/Data Fetching:** TanStack Query (React Query) v5.
- **Styling:** Tailwind CSS (for rapid, responsive UI development).
- **Mechanism:** Short Polling (using TanStack Query's `refetchInterval`).

### Log Producers (Examples)
- **PHP Client:** A helper class/function sending cURL requests.
- **JS Client:** A helper function using `fetch`.

## 3. Architecture & Data Flow

1.  **Ingestion:** Applications (PHP/JS) send an HTTP `POST` request to `http://localhost:6666/api/logs` with a JSON payload.
2.  **Processing:** The Node.js server validates the request and pushes the log entry into an in-memory array. To prevent memory overflows, we will limit the array to the latest 1,000 logs.
3.  **Consumption:** The React Dashboard polls `http://localhost:6666/api/logs` every 1-2 seconds.
4.  **Display:** The dashboard renders the logs, applying client-side filtering based on the selected Log Level.

## 4. Data Structure

**Log Entry JSON Object:**
```json
{
  "level": "INFO",          // Enum: "INFO", "ERROR", "WARN", "DEBUG"
  "message": "User login",  // String
  "timestamp": "2023-10-27T10:00:00Z", // ISO 8601 String
  "service_name": "auth-service" // String: Identifier for the source app
}
```

## 5. API Endpoints

### `POST /api/logs`
- **Description:** Receives a new log entry.
- **Body:** JSON object (as defined above).
- **Response:** `201 Created`

### `GET /api/logs`
- **Description:** Returns the list of recent logs.
- **Response:** JSON Array of Log Entries.

## 6. Frontend Features
- **Live Feed:** Automatically updates via polling.
- **Filtering:** Dropdown to filter by Level (All, INFO, ERROR, WARN, DEBUG).
- **Visuals:** Color-coded rows based on log level (e.g., Red for ERROR, Blue for INFO).
- **Status Indicator:** Shows if the connection to the logger server is active.

## 7. Implementation Steps

### Step 1: Server Setup
- Initialize `server` directory.
- Install dependencies (`express`, `cors`, `nodemon`).
- Implement `server.js` with endpoints and in-memory storage.

### Step 2: Frontend Setup
- Initialize `client` directory using Vite (React + JavaScript).
- Install `monitor` dependencies (`@tanstack/react-query`, `axios`).
- Setup Tailwind CSS.
- Implement `LogDashboard` component with polling configuration.

### Step 3: Integration & Polishing
- Connect Frontend to Backend.
- Implement filtering logic.
- Style the UI for readability.

### Step 4: Client SDK Examples
- Create `examples/test.php` to simulate PHP logs.
- Create `examples/test.js` to simulate JS logs.

## 8. Directory Structure
```
/external-logger
├── PLAN.md
├── server/
│   ├── package.json
│   └── index.js
├── client/
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   └── LogDashboard.jsx
│   │   └── ...
│   └── package.json
└── examples/
    ├── logger.php
    └── logger.js
```
