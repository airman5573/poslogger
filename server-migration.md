# 서버 이전 설정 가이드

## 현재 서버 요약

| 항목 | 값 |
|------|-----|
| OS | Ubuntu 24.04 LTS |
| Node.js | v20.19.5 |
| nginx | 1.24.0 |
| certbot | 2.9.0 |
| 앱 포트 | 6666 |
| 도메인 | poslog.store |
| DB 위치 | /opt/external-logger/logs/logs.db |
| Storage | /opt/external-logger/storage/ |
| UFW | 비활성화 |

---

## 1. 기본 환경 설치

```bash
# Ubuntu 24.04 LTS 기준

# Node.js 20.x 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# nginx, certbot 설치
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

## 2. 프로젝트 클론

```bash
cd /opt
git clone https://github.com/airman5573/poslogger.git external-logger
cd external-logger

# 필요한 디렉토리 생성
mkdir -p logs storage
```

## 3. 환경 변수 설정

```bash
cat > /opt/external-logger/server/.env << 'EOF'
PORT=6666
SQLITE_DB=/opt/external-logger/logs/logs.db
MAX_BODY_BYTES=1048576
CORS_ORIGIN=*
CLIENT_DIST=/opt/external-logger/client/dist
AUTH_PASSWORD=shoplickr
JWT_SECRET=f79461f730d98a1d1c11d0ef09c5f2e5da81465c94532581d62326ddb101025c
EOF
```

## 4. 빌드

```bash
# Server
cd /opt/external-logger/server
npm install
npm run build

# Client
cd /opt/external-logger/client
npm install
npm run build
```

## 5. systemd 서비스 등록

```bash
cat > /etc/systemd/system/external-logger.service << 'EOF'
[Unit]
Description=External Logger
After=network.target

[Service]
EnvironmentFile=/opt/external-logger/server/.env
WorkingDirectory=/opt/external-logger/server
ExecStart=/usr/bin/node /opt/external-logger/server/dist/index.js
Restart=always
RestartSec=3
User=root
Group=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable external-logger
systemctl start external-logger
```

## 6. nginx 설정

```bash
cat > /etc/nginx/sites-available/poslog.store << 'EOF'
server {
    server_name poslog.store www.poslog.store;

    # Cloud Storage: 500MB 파일 업로드 허용
    client_max_body_size 500m;

    # 대용량 파일 업로드를 위한 timeout 설정
    proxy_connect_timeout 300;
    proxy_send_timeout 300;
    proxy_read_timeout 300;
    send_timeout 300;

    location / {
        proxy_pass http://127.0.0.1:6666;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 버퍼링 설정
        proxy_buffering off;
        proxy_request_buffering off;
    }

    listen 80;
}
EOF

ln -s /etc/nginx/sites-available/poslog.store /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 7. SSL 인증서 발급 (도메인 DNS 연결 후)

```bash
certbot --nginx -d poslog.store -d www.poslog.store
```

## 8. 데이터 마이그레이션 (기존 서버에서)

```bash
# 기존 서버에서 실행 - logs.db와 storage 파일 복사
scp /opt/external-logger/logs/logs.db NEW_SERVER:/opt/external-logger/logs/
scp -r /opt/external-logger/storage/* NEW_SERVER:/opt/external-logger/storage/
```

## 9. 서비스 확인

```bash
# 서비스 상태 확인
systemctl status external-logger

# 로그 확인
journalctl -u external-logger -f

# health check
curl http://localhost:6666/health
```
