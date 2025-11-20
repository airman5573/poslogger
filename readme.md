# poslog.store 사용 가이드

## API 요약
- 베이스: `https://poslog.store`
- POST `/api/logs`: `{ level, label, message, context?, source?, timestamp? }`
- GET `/api/logs`: 레벨/라벨/소스/기간/검색/페이지네이션
- DELETE `/api/logs/:id`: 단건 삭제
- 모델: level, label, message, context, timestamp, source (id/created_at은 서버 생성)
- CORS 전체 허용, JSON body 제한 1MB

## JS/TS 클라이언트 (`helpers/logger.js`)
Node/브라우저 공용 헬퍼입니다.

```js
// Node 18+ 네이티브 fetch 사용. (Node 18 미만은 node-fetch 설치)
const { sendLog } = require("./helpers/logger");

sendLog({
  level: "INFO",
  label: "my-plugin",
  message: "주문 생성 완료",
  context: { orderId: 123, amount: 9900 },
  source: "node-app",
})
  .then((res) => console.log("logged", res))
  .catch(console.error);
```

필드:
- `level` (필수): INFO | WARN | ERROR | DEBUG 등
- `label` (필수): 서비스/플러그인 식별자
- `message` (필수): 로그 메시지
- `context` (선택): 객체/문자열
- `source` (선택): 소스 식별자
- `timestamp` (선택): ISO 문자열(미지정 시 서버가 채움)
- 엔드포인트 변경: `sendLog({...}, "https://custom/api/logs")`

## PHP 클라이언트 (`helpers/logger.php`)

```php
<?php
require_once __DIR__ . '/helpers/logger.php';

send_log(
    'INFO',           // level
    'my-plugin',      // label
    '주문 생성 완료',   // message
    ['orderId' => 123, 'amount' => 9900], // context
    'php-app'         // source (optional)
);
?>
```
- 엔드포인트 변경: 마지막 인자로 `send_log(..., $endpoint)` 전달

## UI 접근
- 웹 대시보드: `https://poslog.store`
- 기능: 필터(level/label/source/기간/검색), 자동/수동 새로고침, 자동 스크롤, 단건 삭제, 로그 복사, 컨텍스트 코드 하이라이트

## 서버/운영
- 서비스: `external-logger.service` (systemd), 6666 -> nginx(80/443)
- DB: `/opt/external-logger/logs/logs.db` (SQLite)
- 환경 변수 예: `server/.env.example`

## 테스트 예시 (curl)
```bash
curl -XPOST https://poslog.store/api/logs \
  -H 'Content-Type: application/json' \
  -d '{"level":"INFO","label":"demo","message":"hello","context":{"foo":"bar"},"source":"curl"}'

curl "https://poslog.store/api/logs?level=INFO&limit=10"
```

## 배포 스크립트
- 파일: `deploy.sh` (실행 권한 부여: `chmod +x deploy.sh`)
- 실행: `./deploy.sh`
- 동작: SSH로 서버 접속 후 `/opt/external-logger`에서 `git fetch --all` + `git reset --hard origin/main` (강제 최신화)
- 환경변수로 조정: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY`, `DEPLOY_DIR` (기본은 115.68.177.22, root, `~/.ssh/poslogger.store`, `/opt/external-logger`)

## 서버에서 자주 쓰는 명령어
- SSH 접속: `ssh -i ~/.ssh/poslogger.store root@115.68.177.22`
- 서비스 재시작/상태: `systemctl restart external-logger.service` / `systemctl status external-logger.service --no-pager`
- 로그 확인: `journalctl -u external-logger.service -n 100 --no-pager`
- 빌드(서버): `cd /opt/external-logger/server && npm install && npm run build`
- 빌드(클라이언트): `cd /opt/external-logger/client && npm install && npm run build`
- 헬스/API 체크:
  - `curl -I https://poslog.store`
  - `curl -s https://poslog.store/health`
  - `curl -s 'https://poslog.store/api/logs?limit=5'`

## 운영 단축 스크립트
- 파일: `ops.sh` (실행 권한 부여: `chmod +x ops.sh`)
- 실행 예: `./ops.sh status` / `./ops.sh restart` / `./ops.sh logs` / `./ops.sh build-server` / `./ops.sh build-client` / `./ops.sh health`
- 신규: `./ops.sh pull-build` (git fetch/reset hard origin/main → client build → server build → 서비스 재시작)
- 환경변수: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY`, `DEPLOY_DIR`, `API_BASE` (기본: 115.68.177.22, root, `~/.ssh/poslogger.store`, `/opt/external-logger`, `https://poslog.store`)
