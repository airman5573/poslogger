# Requirements Document

## Introduction

MCP(Model Context Protocol) 로그 서버 연동 기능은 AI가 로그 서버와 직접 통신하여 시나리오 기반으로 로그를 조회하고 분석할 수 있도록 합니다. 현재 디버깅 시 수동으로 로그를 복사하여 AI에게 전달하는 번거로운 과정을 자동화하여, 개발자의 디버깅 워크플로우를 크게 개선합니다.

핵심 개념은 **시나리오 ID**입니다. AI가 로그 작성 요청을 받으면 고유한 시나리오 ID를 생성하고, 해당 시나리오의 모든 로그에 이 ID를 포함하여 전송합니다. 이후 AI가 로그 조회 시 시나리오 ID로 필터링하여 관련 로그만 가져올 수 있습니다.

## Glossary

- **MCP (Model Context Protocol)**: AI 모델이 외부 도구 및 서비스와 통신하기 위한 프로토콜
- **시나리오 ID (Scenario ID)**: 특정 디버깅 세션 또는 기능 플로우를 식별하는 고유 문자열 (예: "order-list-20251202-abc123")
- **로그 서버 (Log Server)**: 로그를 수집하고 저장하는 외부 서버 (`https://poslog.store/api/logs`)
- **MCP 서버**: AI가 호출할 수 있는 MCP 도구를 제공하는 서버
- **LogPayload**: 로그 전송 시 사용되는 데이터 구조
- **LogRecord**: 데이터베이스에 저장된 로그 레코드
- **로그 레벨 (Log Level)**: 로그의 심각도를 나타내는 값 (DEBUG, INFO, WARN, ERROR)

## Requirements

### Requirement 1

**User Story:** As a developer, I want to include a scenario ID in log entries, so that I can group and filter related logs for a specific debugging session.

#### Acceptance Criteria

1. WHEN a log entry is created with a scenario ID THEN the Log Server SHALL store the scenario ID alongside the log record
2. WHEN a log entry is created without a scenario ID THEN the Log Server SHALL store the log record with a null scenario ID value
3. WHEN the database schema is initialized THEN the Log Server SHALL create an index on the scenario_id column for efficient filtering

### Requirement 2

**User Story:** As an AI assistant, I want to query logs by scenario ID, so that I can retrieve all logs related to a specific debugging session.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/logs` with a `scenarioId` query parameter THEN the Log Server SHALL return only logs matching that scenario ID
2. WHEN a GET request is made with `scenarioId` and `level` parameters THEN the Log Server SHALL return logs matching both the scenario ID and the specified log level
3. WHEN a GET request is made with `scenarioId` and `limit` parameters THEN the Log Server SHALL return at most the specified number of logs (default: 100, maximum: 500)
4. WHEN the response would exceed 100 log entries THEN the Log Server SHALL truncate the response to 100 entries and include a `hasMore` flag set to true

### Requirement 3

**User Story:** As an AI assistant, I want to list recent scenarios, so that I can help users identify which debugging session to analyze.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/logs/scenarios` THEN the Log Server SHALL return a list of distinct scenario IDs with their log counts and time ranges
2. WHEN listing scenarios THEN the Log Server SHALL order results by the most recent log timestamp in descending order
3. WHEN listing scenarios THEN the Log Server SHALL limit results to the 20 most recent scenarios by default

### Requirement 4

**User Story:** As an AI assistant, I want to use MCP tools to interact with the log server, so that I can programmatically retrieve and analyze logs.

#### Acceptance Criteria

1. WHEN the MCP server starts THEN the MCP Server SHALL register a `get_logs` tool that accepts scenarioId (required), limit (optional), and level (optional) parameters using the @modelcontextprotocol/sdk library
2. WHEN the `get_logs` tool is invoked with a scenario ID THEN the MCP Server SHALL call the Log Server API and return the formatted log entries as text content
3. WHEN the MCP server starts THEN the MCP Server SHALL register a `list_scenarios` tool that returns recent scenario summaries
4. WHEN the `list_scenarios` tool is invoked THEN the MCP Server SHALL call the Log Server API and return scenario IDs with log counts and time ranges
5. WHEN the MCP server runs in STDIO mode THEN the MCP Server SHALL use StdioServerTransport and write logs only to stderr (not stdout)

### Requirement 5

**User Story:** As a developer, I want the MCP server to authenticate with the log server, so that log data remains secure.

#### Acceptance Criteria

1. WHEN the MCP server is configured THEN the MCP Server SHALL read the API key from the LOG_SERVER_API_KEY environment variable
2. WHEN the MCP server makes requests to the Log Server THEN the MCP Server SHALL include the API key in the X-API-Key request header
3. IF the X-API-Key header is missing or contains an invalid value THEN the Log Server SHALL return a 401 Unauthorized response

### Requirement 6

**User Story:** As a developer, I want scenario IDs to follow a consistent naming convention, so that they are both human-readable and unique.

#### Acceptance Criteria

1. WHEN generating a scenario ID THEN the system SHALL use the format `{description}-{YYYYMMDD}-{random6chars}` (예: "order-list-20251202-abc123")
2. WHEN a scenario ID is provided THEN the Log Server SHALL validate that the scenario ID contains only alphanumeric characters, hyphens, and underscores
3. WHEN a scenario ID exceeds 100 characters THEN the Log Server SHALL reject the log entry with a 400 Bad Request response

### Requirement 7

**User Story:** As a system administrator, I want logs to be automatically cleaned up, so that storage does not grow indefinitely.

#### Acceptance Criteria

1. WHEN a log record's created_at timestamp is older than 30 days THEN the Log Server SHALL consider the record eligible for deletion
2. WHEN the deleteOldLogs function is called THEN the Log Server SHALL delete all log records older than 30 days and return the count of deleted entries
3. WHEN the server starts THEN the Log Server SHALL schedule a daily cleanup task to run the deleteOldLogs function
