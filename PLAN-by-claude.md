# External Logger System - Implementation Plan

## Overview
Node.js 기반의 외부 로거 시스템으로, PHP와 JavaScript에서 로그를 전송받아 SQLite에 저장하고 웹 브라우저에서 실시간으로 확인할 수 있는 시스템

## Architecture

### 1. Node.js Server (localhost:6666)
- **Express**: HTTP API 및 웹 UI 제공
- **WebSocket (ws)**: 실시간 로그 푸시
- **better-sqlite3**: 로그 저장 및 검색

### 2. Log Format (Shoplic Logger 기반)

```json
{
  "timestamp": "2025-11-20T15:34:22.123Z",
  "log_level": "ERROR|WARNING|INFO|LOG|DEBUG",
  "plugin_name": "my-plugin",
  "file_path": "/path/to/file.php",
  "class_name": "MyClass",
  "function_name": "myMethod",
  "message": "Error message",
  "data": {...},
  "source": "php|js"
}
```

**필드 설명:**
- `timestamp`: ISO 8601 형식의 타임스탬프 (자동 생성)
- `log_level`: 로그 레벨 (ERROR, WARNING, INFO, LOG, DEBUG)
- `plugin_name`: 플러그인/테마 식별자
- `file_path`: 파일 경로 (PHP: `__FILE__`, JS: 전체 경로)
- `class_name`: 클래스명 (없으면 빈 문자열)
- `function_name`: 함수/메소드명 (없으면 빈 문자열)
- `message`: 로그 메시지
- `data`: 추가 데이터 (객체/배열 또는 null)
- `source`: 로그 소스 (php 또는 js)

### 3. Web UI Features

#### 실시간 로그 스트림
- WebSocket을 통한 실시간 로그 수신
- 자동 스크롤 (토글 가능)

#### 필터링 기능
- **로그 레벨별 필터**: ERROR, WARNING, INFO, LOG, DEBUG
- **플러그인별 필터**: 드롭다운 또는 다중 선택
- **시간 범위 필터**: 시작 시간 ~ 종료 시간
- **소스별 필터**: PHP, JavaScript

#### 검색 기능
- 메시지 텍스트 검색
- 파일 경로 검색
- 함수명 검색

#### Export 기능
- JSON 형식 export
- CSV 형식 export
- 필터링된 결과만 export 가능

### 4. Client Libraries

#### PHP Client (`clients/logger.php`)
```php
ExternalLogger::log('ERROR', 'my-plugin', __FILE__, __CLASS__, __METHOD__, 'Error message', $data);
```

**특징:**
- HTTP POST로 localhost:6666/api/log에 전송
- 비동기 전송 옵션 (성능 최적화)
- 타임아웃 설정 (1초)
- 에러 발생 시 무시 (로거가 메인 앱에 영향 없음)

#### JavaScript Client (`clients/logger.js`)
```javascript
ExternalLogger.log('ERROR', 'my-plugin', '/path/to/file.js', 'MyClass', 'myMethod', 'Error message', data);
```

**특징:**
- fetch API 사용
- 비동기 전송
- 에러 발생 시 무시

### 5. Project Structure

```
/external-logger/
├── server.js              # 메인 서버 (Express + WebSocket)
├── database.js            # SQLite 데이터베이스 관리
├── package.json           # 의존성 관리
├── logs.db               # SQLite 데이터베이스 파일 (자동 생성)
├── public/
│   └── index.html        # 웹 UI (HTML + CSS + JavaScript)
├── clients/
│   ├── logger.php        # PHP 클라이언트 라이브러리
│   └── logger.js         # JavaScript 클라이언트 라이브러리
├── PLAN.md               # 이 파일
└── README.md             # 사용 설명서
```

## API Endpoints

### POST /api/log
로그 데이터 수신

**Request Body:**
```json
{
  "log_level": "ERROR",
  "plugin_name": "my-plugin",
  "file_path": "/path/to/file.php",
  "class_name": "MyClass",
  "function_name": "myMethod",
  "message": "Error message",
  "data": {...},
  "source": "php"
}
```

**Response:**
```json
{
  "success": true,
  "id": 123
}
```

### GET /api/logs
로그 조회 (필터링 지원)

**Query Parameters:**
- `log_level`: 로그 레벨 (쉼표로 구분)
- `plugin_name`: 플러그인명 (쉼표로 구분)
- `source`: php 또는 js
- `start_time`: 시작 시간 (ISO 8601)
- `end_time`: 종료 시간 (ISO 8601)
- `search`: 검색어
- `limit`: 결과 개수 제한 (기본: 1000)
- `offset`: 오프셋 (페이지네이션)

**Response:**
```json
{
  "logs": [...],
  "total": 1234
}
```

### GET /api/export
로그 Export

**Query Parameters:** (위와 동일)
- `format`: json 또는 csv

### WebSocket /ws
실시간 로그 수신

**메시지 형식:**
```json
{
  "type": "log",
  "data": {...}
}
```

## Database Schema

### logs 테이블

```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  log_level TEXT NOT NULL,
  plugin_name TEXT NOT NULL,
  file_path TEXT,
  class_name TEXT,
  function_name TEXT,
  message TEXT NOT NULL,
  data TEXT,
  source TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timestamp ON logs(timestamp);
CREATE INDEX idx_log_level ON logs(log_level);
CREATE INDEX idx_plugin_name ON logs(plugin_name);
CREATE INDEX idx_source ON logs(source);
```

## Implementation Steps

1. ✅ Create project structure and package.json
2. ✅ Implement Node.js server with Express and WebSocket
3. ✅ Set up SQLite database with better-sqlite3
4. ✅ Create log receiver API endpoint
5. ✅ Implement real-time log broadcast with WebSocket
6. ✅ Build web UI with filters and search
7. ✅ Create PHP logger client library
8. ✅ Create JavaScript logger client library
9. ✅ Add export functionality (JSON, CSV)
10. ✅ Create README with usage instructions

## Dependencies

```json
{
  "express": "^4.18.2",
  "ws": "^8.14.2",
  "better-sqlite3": "^9.2.2",
  "cors": "^2.8.5"
}
```

## Usage Example

### PHP
```php
<?php
require_once 'clients/logger.php';

ExternalLogger::log('ERROR', 'woocommerce', __FILE__, __CLASS__, __METHOD__, 'Payment failed', ['order_id' => 456, 'error' => 'Card declined']);
?>
```

### JavaScript
```javascript
import ExternalLogger from './clients/logger.js';

ExternalLogger.log('ERROR', 'woocommerce', '/wp-content/plugins/woocommerce/assets/js/checkout.js', 'CheckoutForm', 'processPayment', 'Payment failed', { order_id: 456, error: 'Card declined' });
```

### Running the Server
```bash
npm install
node server.js
```

서버 시작 후 브라우저에서 `http://localhost:6666` 접속

## Notes

- 로그는 SQLite에 영구 저장됨
- 로거 에러는 메인 애플리케이션에 영향을 주지 않음
- 웹 UI는 반응형으로 모바일에서도 사용 가능
- WebSocket 연결 실패 시 자동 재연결
- 대용량 로그 처리를 위한 페이지네이션 지원
