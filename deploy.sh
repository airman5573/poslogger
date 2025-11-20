#!/usr/bin/env bash
set -euo pipefail

# 간단 배포 스크립트: 원격 서버에서 강제 git pull (origin/main 기준)
# 환경 변수로 조정 가능:
#   DEPLOY_HOST (기본 115.68.177.22)
#   DEPLOY_USER (기본 root)
#   DEPLOY_KEY  (기본 ~/.ssh/poslogger.store)
#   DEPLOY_DIR  (기본 /opt/external-logger)

HOST="${DEPLOY_HOST:-115.68.177.22}"
USER="${DEPLOY_USER:-root}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/poslogger.store}"
DIR="${DEPLOY_DIR:-/opt/external-logger}"

ssh -i "$KEY" -o StrictHostKeyChecking=no "${USER}@${HOST}" <<EOF
  set -e
  cd "$DIR"
  git fetch --all
  git reset --hard origin/main
EOF

echo "Done: pulled origin/main on ${USER}@${HOST}:${DIR}"
