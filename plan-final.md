# External Logger – Final Plan (poslog.store)

## 목표
- 원격 서버(poslog.store)에서 Node.js(Express) + SQLite 로거를 운영하고, 브라우저에서 React + Tailwind + shadcn/ui + TanStack Query로 폴링 방식으로 로그를 조회/필터/삭제/복사한다.
- CORS 전부 허용(개발/운영 모두), Export 기능은 제외한다.

## 데이터 모델 (고정 스키마)
- 필드: `id (integer PK)`, `level`, `label`, `message`, `context`(JSON 문자열), `timestamp`(ISO string), `source`.
- 필터 기준: level, label, source, timestamp 범위, 메시지/컨텍스트 텍스트 검색.

## 아키텍처 개요
- 서버: Express + SQLite (better-sqlite3) on poslog.store: 포트 `.env`로 지정 (기본 6666).
- 스토리지: SQLite 단일 DB 파일(예: `logs/logs.db`), 인덱스(level, label, source, timestamp).
- 통신: 전부 HTTP Polling (WebSocket 사용 안 함).
- CORS: `*` 허용, 옵션 origin 설정 가능.
- 클라이언트: React(Vite) + shadcn/ui + Tailwind + TanStack Query 5. 폴링 주기 기본 2~5초, 수동 새로고침 버튼 제공.

## API 설계 (HTTP)
- `POST /api/logs`
  - 바디: `{ level, label, message, context?, timestamp?, source? }`
  - 서버에서 `id`, 누락된 `timestamp`를 UTC ISO로 채움. 즉시 SQLite insert.
  - 응답: `201 { id }`. 유효성 검사: level/label/message 길이 제한, context 크기 제한.

- `GET /api/logs`
  - 쿼리: `level`(콤마), `label`(콤마), `source`(콤마), `start`, `end`(ISO), `q`(message/context LIKE), `limit`(기본 200, 최대 1000), `offset` 또는 `cursor`(`since_id` 또는 `since_ts`).
  - 정렬: 최신 우선. 응답: `{ items: LogEntry[], nextCursor?: string }`.

- `DELETE /api/logs/:id`
  - 단일 로그 삭제. 응답 204. (벌크 삭제는 추후 필요 시 추가.)

- 헬스체크: `GET /health` (옵션).

## 데이터베이스 스키마
```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  label TEXT NOT NULL,
  message TEXT NOT NULL,
  context TEXT,
  timestamp TEXT NOT NULL,
  source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_label ON logs(label);
CREATE INDEX idx_logs_source ON logs(source);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
```

## 클라이언트(UI) 요구사항
- 필터: level 멀티선택, label 멀티선택, source 멀티선택, 기간(start/end), 텍스트 검색(q).
- 표시: 레벨 별 배지 색상, timestamp, label, source, message, context(JSON 뷰어).
- 동작: 수동 새로고침, 자동 폴링 간격 설정/토글, 최신 자동 스크롤 토글.
- 로그 복사: 한 건 단위 copy 버튼 (JSON/텍스트), 키보드 단축키 옵션.
- 로그 삭제: 행 액션으로 단건 삭제(DELETE API 호출 후 낙관적 업데이트).
- 가독성: code highlighter(예: shiki/rehype-prism)로 context/message 코드 블록 렌더.
- 상태: 로딩/에러/빈 상태 표시. 페이지네이션 또는 무한 스크롤.

## 서버 동작 요건
- 모든 요청 CORS 허용(`Access-Control-Allow-Origin: *`).
- JSON body 1MB 제한, oversize 413 응답.
- 요청 검증 실패 400, DB 오류 500.
- 종료 신호 시 SQLite 핸들 정리.
- 로그 파일/DB는 `.gitignore` 처리.

## 환경 변수 (`.env` / `.env.example`)
- `PORT=6666`
- `SQLITE_DB=./logs/logs.db`
- `POLL_DEFAULT_MS=2000` (클라이언트 참고용)
- `CORS_ORIGIN=*`
- `MAX_BODY_BYTES=1048576`

## 폴더 구조(코덱스안 기반)
```
external-logger/
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.ts (Express 앱 부트스트랩)
│   │   ├── db.ts (SQLite 연결/쿼리 래퍼)
│   │   ├── routes/
│   │   │   └── logs.ts (POST/GET/DELETE)
│   │   └── middleware/
│   │       └── validate.ts (스키마 검증)
│   └── .env.example
├── client/
│   ├── package.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── LogTable.tsx
│   │   │   ├── Filters.tsx
│   │   │   ├── LogContextViewer.tsx
│   │   │   └── Toolbar.tsx
│   │   └── lib/
│   │       └── api.ts (TanStack Query 훅)
│   └── tailwind.config.js
├── helpers/
│   ├── logger.php (PHP 전송 헬퍼)
│   └── logger.js (JS 전송 헬퍼)
├── logs/ (런타임 생성, git 무시)
└── README.md
```

## 구현 단계
1) 서버 세팅: Express, better-sqlite3, CORS, body-parser. DB 초기화와 인덱스 생성. 스키마 검증 추가.
2) API 구현: POST/GET/DELETE 로그. 필터/검색/페이지네이션/커서. 에러 핸들링/레이트 리밋(옵션).
3) 클라이언트 세팅: Vite+React, Tailwind, shadcn/ui 구성, TanStack Query Provider, 환경값로 API base(`https://poslog.store`).
4) UI 기능: 필터 바, 로그 리스트(색상 배지, 하이라이터), 컨텍스트 뷰어(JSON), 복사 버튼, 삭제 버튼, 폴링 인터벌 설정, 자동 스크롤.
5) 헬퍼 추가: PHP/JS 샘플 전송 함수와 사용 예시.
6) 배포/운영: poslog.store에 Node/SQLite 설치, 환경변수 설정, PM2/시스템 서비스 등록, CORS 확인.
7) 테스트: 서버 단위 테스트(검증/필터/삭제), 통합 테스트(POST→GET), 클라이언트 렌더/필터/삭제/복사 동작 확인.

## 주의/보안
- 관리자가 아닌 경우 삭제 기능 제한 필요 시 추후 토큰/간단 비밀번호 추가(지금은 오픈).
- context 내 PII 포함 가능성이 있으므로 필요 시 마스킹 옵션 고려.
