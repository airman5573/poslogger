# External Logger 접근 제어/장애 보고

## 개요
- 공개 주소 `https://poslog.store`에 로그 뷰어가 노출돼 있어 접근 제어 필요.
- 요청: 비밀번호 1회 입력 시 15분간 유지되는 JWT 기반 검증 추가.
- 작업 중 502 Bad Gateway 발생 → 원인 조사 및 복구.

## 타임라인 (KST)
- **11/21 11:50~12:00**: 코드에 JWT 세션/로그인 UI 추가, 서버 빌드/배포 준비.
- **12:00**: 수동 `nohup npm start`로 서버 띄우려다 6666 포트 점유 오류(EADDRINUSE) 발생. 기존 systemd 서비스가 이미 포트 사용 중이었음.
- **12:01**: systemd 서비스 `external-logger.service` 재시작 → 정상 기동 확인, 502 해소.

## 문제 요약
1) **포트 중복 실행(EADDRINUSE)**
   - 기존 systemd 서비스가 6666 포트로 동작 중인데, 별도로 수동 `npm start`를 백그라운드로 실행하며 동일 포트를 다시 바인딩하려다 충돌.
   - `/var/log/external-logger.log`에 `listen EADDRINUSE: address already in use 0.0.0.0:6666` 기록.

2) **502 Bad Gateway**
   - Nginx가 127.0.0.1:6666으로 리버스 프록시 설정(`/etc/nginx/sites-enabled/poslog.store`).
   - 백엔드가 충돌/비기동 상태에서 응답 불가 → Nginx가 502 반환.

## 조치 및 결과
- `.env`에 인증 환경변수 설정:
  - `AUTH_PASSWORD=shoplickr`
  - `JWT_SECRET=<64 hex 랜덤>`
- `npm run build` (Node 20.19.5) 후 systemd 서비스 재시작: `systemctl restart external-logger.service`.
- 상태 확인: `systemctl status external-logger.service` → active (running), 헬스체크 `curl http://localhost:6666/health` OK.
- 현재 Nginx 프록시 경유 정상 응답.

## 환경 정보
- 서버: `115.68.177.22` (Ubuntu), Node v20.19.5.
- 서비스: systemd 유닛 `/etc/systemd/system/external-logger.service` (환경파일 `/opt/external-logger/server/.env`).
- 백엔드 포트: 6666, Nginx reverse proxy.

## 재발 방지/운영 메모
- 운영은 systemd 서비스로만 관리(수동 `npm start` 금지). 필요 시 `sudo systemctl restart external-logger.service` 사용.
- 포트 충돌 시 `/var/log/external-logger.log`의 `EADDRINUSE` 확인 → 중복 프로세스 종료.
- 비밀번호 변경 시 `/opt/external-logger/server/.env`의 `AUTH_PASSWORD` 수정 후 `systemctl restart external-logger.service`.
- Node 버전 20.x 유지(better-sqlite3 호환성).
