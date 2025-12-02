# Implementation Plan

## Phase 1: 로그 서버 확장

- [ ] 1. 데이터베이스 스키마 및 타입 확장
  - [ ] 1.1 LogRecord 및 InsertLog 타입에 scenarioId 필드 추가
    - `server/src/types.ts` 수정
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 DB 스키마에 scenario_id 컬럼 및 인덱스 추가
    - `server/src/db.ts`의 initSchema 함수 수정
    - 기존 테이블에 컬럼 추가 마이그레이션 로직 포함
    - _Requirements: 1.3_
  - [ ] 1.3 insertLog 함수에 scenarioId 처리 추가
    - INSERT 쿼리에 scenario_id 컬럼 추가
    - _Requirements: 1.1, 1.2_
  - [ ] 1.4 listLogs 함수에 scenarioId 필터링 추가
    - ListParams 타입에 scenarioId 추가
    - WHERE 절에 scenario_id 조건 추가
    - _Requirements: 2.1_
  - [ ]* 1.5 Write property test for scenario ID round trip
    - **Property 1: Scenario ID Round Trip**
    - **Validates: Requirements 1.1, 1.2**

- [ ] 2. 시나리오 목록 조회 기능 구현
  - [ ] 2.1 listScenarios DB 함수 구현
    - scenario_id별 집계 쿼리 (count, min/max timestamp)
    - lastLogAt 기준 내림차순 정렬
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 2.2 Write property test for scenario list accuracy
    - **Property 5: Scenario List Accuracy**
    - **Validates: Requirements 3.1**
  - [ ]* 2.3 Write property test for scenario list ordering
    - **Property 6: Scenario List Ordering**
    - **Validates: Requirements 3.2**

- [ ] 3. API 라우트 확장
  - [ ] 3.1 POST /api/logs 스키마에 scenarioId 검증 추가
    - Zod 스키마에 scenarioId 필드 추가 (max 100자, alphanumeric/hyphen/underscore만 허용)
    - _Requirements: 6.2, 6.3_
  - [ ] 3.2 GET /api/logs에 scenarioId 쿼리 파라미터 추가
    - listSchema에 scenarioId 추가
    - listLogs 호출 시 scenarioId 전달
    - hasMore 플래그 응답에 추가
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ] 3.3 GET /api/logs/scenarios 엔드포인트 구현
    - listScenarios 함수 호출
    - 응답 형식: { scenarios: [...] }
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 3.4 Write property test for scenario ID filtering
    - **Property 2: Scenario ID Filtering Correctness**
    - **Validates: Requirements 2.1**
  - [ ]* 3.5 Write property test for combined filters
    - **Property 3: Combined Filter Correctness**
    - **Validates: Requirements 2.2**
  - [ ]* 3.6 Write property test for limit constraint
    - **Property 4: Limit Constraint**
    - **Validates: Requirements 2.3, 2.4**
  - [ ]* 3.7 Write property test for scenario ID validation
    - **Property 10: Scenario ID Validation**
    - **Validates: Requirements 6.2, 6.3**

- [ ] 4. 로그 정리(TTL) 기능 구현
  - [ ] 4.1 deleteOldLogs DB 함수 구현
    - created_at 기준 30일 이상 된 로그 삭제
    - 삭제된 로그 개수 반환
    - _Requirements: 7.1, 7.2_
  - [ ] 4.2 서버 시작 시 일일 정리 스케줄링 추가
    - setInterval로 24시간마다 deleteOldLogs 호출
    - 삭제 결과를 stderr로 로깅
    - _Requirements: 7.3_

- [ ] 5. Checkpoint - 로그 서버 테스트 확인
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: MCP 서버 구현

- [ ] 6. MCP 서버 프로젝트 설정
  - [ ] 6.1 mcp-server 디렉토리 및 package.json 생성
    - @modelcontextprotocol/sdk, zod 의존성 추가
    - TypeScript 설정
    - _Requirements: 4.1_
  - [ ] 6.2 환경 변수 설정 구조 구현
    - LOG_SERVER_URL, LOG_SERVER_API_KEY 환경 변수 읽기
    - _Requirements: 5.1_

- [ ] 7. MCP 도구 구현
  - [ ] 7.1 로그 서버 API 클라이언트 구현
    - fetch 기반 HTTP 클라이언트
    - API 키 헤더 포함
    - _Requirements: 5.2_
  - [ ] 7.2 get_logs 도구 구현
    - scenarioId (필수), limit (선택), level (선택) 파라미터
    - 로그 서버 API 호출 및 결과 포맷팅
    - _Requirements: 4.1, 4.2_
  - [ ] 7.3 list_scenarios 도구 구현
    - limit (선택) 파라미터
    - 시나리오 목록 API 호출 및 결과 포맷팅
    - _Requirements: 4.3, 4.4_
  - [ ] 7.4 MCP 서버 메인 엔트리포인트 구현
    - StdioServerTransport 사용
    - stderr로만 로그 출력
    - _Requirements: 4.5_
  - [ ]* 7.5 Write property test for MCP tool response format
    - **Property 7: MCP Tool Response Format**
    - **Validates: Requirements 4.2**
  - [ ]* 7.6 Write property test for authentication header
    - **Property 8: Authentication Header Inclusion**
    - **Validates: Requirements 5.2**

- [ ] 8. 인증 처리
  - [ ] 8.1 로그 서버에 API 키 인증 미들웨어 추가 (MCP 전용)
    - X-API-Key 헤더 검증
    - 기존 쿠키 인증과 병행 (OR 조건)
    - _Requirements: 5.3_
  - [ ]* 8.2 Write property test for invalid auth rejection
    - **Property 9: Invalid Auth Rejection**
    - **Validates: Requirements 5.3**

- [ ] 9. Checkpoint - MCP 서버 테스트 확인
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: 클라이언트 타입 확장 및 문서화

- [ ] 10. 클라이언트 타입 확장
  - [ ] 10.1 LogQuery 타입에 scenarioId 추가
    - `client/src/types.ts` 수정
    - _Requirements: 1.1_
  - [ ] 10.2 API 클라이언트에 scenarioId 파라미터 처리 추가
    - `client/src/lib/api.ts`의 buildQuery 함수 수정
    - _Requirements: 2.1_

- [ ] 11. MCP 서버 설정 문서화
  - [ ] 11.1 mcp.json 설정 예시 작성
    - Kiro MCP 설정 파일 예시
    - 환경 변수 설명
    - _Requirements: 4.1_

- [ ] 12. Final Checkpoint - 전체 테스트 확인
  - Ensure all tests pass, ask the user if questions arise.
