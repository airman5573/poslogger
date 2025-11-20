<?php
/**
 * External logger 전송 헬퍼 (PHP 7+)
 *
 * @param string $level 로그 레벨 (INFO|WARN|ERROR|DEBUG 등)
 * @param string $label 서비스/플러그인 식별자
 * @param string $message 메시지
 * @param array|string|null $context 추가 데이터(배열/객체 또는 문자열)
 * @param string|null $source 소스 식별자
 * @param string|null $timestamp ISO 타임스탬프(없으면 서버가 채움)
 * @param string $endpoint 엔드포인트 (기본: https://poslog.store/api/logs)
 * @return array|null API 응답(JSON) 또는 null
 */
function send_log($level, $label, $message, $context = [], $source = null, $timestamp = null, $endpoint = 'https://poslog.store/api/logs') {
    $payload = [
        'level' => $level,
        'label' => $label,
        'message' => $message,
        'context' => $context,
        'source' => $source,
        'timestamp' => $timestamp,
    ];

    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 1);

    $response = curl_exec($ch);
    if ($response === false) {
        error_log('send_log error: ' . curl_error($ch));
        curl_close($ch);
        return null;
    }
    curl_close($ch);
    return json_decode($response, true);
}
?>
