const DEFAULT_ENDPOINT = "https://poslog.store/api/logs";

/**
 * External logger 전송 헬퍼 (Node/Browser 공용)
 * @param {Object} params
 * @param {string} params.level 로그 레벨 (INFO|WARN|ERROR|DEBUG 등)
 * @param {string} params.label 서비스/플러그인 식별자
 * @param {string} params.message 로그 메시지
 * @param {object|string} [params.context] 추가 데이터(객체/문자열)
 * @param {string} [params.source] 소스 식별자
 * @param {string} [params.timestamp] ISO 타임스탬프(미지정 시 서버가 채움)
 * @param {string} [endpoint] 커스텀 엔드포인트
 */
async function sendLog(
  { level, label, message, context = {}, source, timestamp },
  endpoint = DEFAULT_ENDPOINT
) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, label, message, context, source, timestamp }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Log send failed (${res.status}): ${txt}`);
  }
  return res.json();
}

module.exports = { sendLog };
