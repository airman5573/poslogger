# POS Logger 로그 미기록 이슈 정리

- 증상: PHP `PosLogger::send` 호출했을 때 `https://poslog.store/api/logs`에 로그가 보이지 않음.
- 직접 확인: 이 머신에서 `curl`로 동일 API에 POST 테스트 수행.
  - `timestamp: null` 포함 시 `400 Bad Request` 응답 (`Expected string, received null`).
  - `timestamp`를 문자열로 넣어 전송 시 `201 Created` 응답, `{"id":3}`로 정상 기록 확인.
- 결론: API는 정상 수신 중이며, 페이로드의 `timestamp`가 `null`이면 거부됨. `timestamp`가 비어 있다면 필드를 제외하거나 문자열(예: `now()->toISOString()`)로 보내도록 수정 필요.
- 참고 명령어:
  - 실패 예시: `curl -i -X POST https://poslog.store/api/logs -H 'Content-Type: application/json' -d '{"level":"INFO","label":"codex-test","message":"manual curl from cli","context":{"foo":"bar"},"source":"codex","timestamp":null}'`
  - 성공 예시: `curl -i -X POST https://poslog.store/api/logs -H 'Content-Type: application/json' -d '{"level":"INFO","label":"codex-test","message":"manual curl from cli","context":{"foo":"bar"},"source":"codex","timestamp":"2025-11-20T08:56:27Z"}'`
