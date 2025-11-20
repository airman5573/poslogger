#!/usr/bin/env bash
set -euo pipefail

# 스크립트 위치 기준으로 로컬 Git 명령을 수행하기 위해 절대 경로 계산
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 원격 서버 운영 단축 스크립트
# 환경 변수로 조정 가능:
#   DEPLOY_HOST (기본 115.68.177.22)
#   DEPLOY_USER (기본 root)
#   DEPLOY_KEY  (기본 ~/.ssh/poslogger.store)
#   DEPLOY_DIR  (기본 /opt/external-logger)
#   API_BASE    (기본 https://poslog.store)

HOST="${DEPLOY_HOST:-115.68.177.22}"
USER="${DEPLOY_USER:-root}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/poslogger.store}"
DIR="${DEPLOY_DIR:-/opt/external-logger}"
API_BASE="${API_BASE:-https://poslog.store}"
BRANCH="${DEPLOY_BRANCH:-main}"

usage() {
  cat <<EOF
Usage: ./ops.sh <command>
Commands:
  status         systemctl status external-logger.service
  restart        restart service then show status
  logs           journalctl tail (-n 100)
  build-server   npm install && npm run build (server)
  build-client   npm install && npm run build (client)
  deploy     (로컬) git commit -m "working" & git push origin $BRANCH,
                 (원격) git fetch/reset --hard origin/$BRANCH, build client+server, restart service
  health         curl -I /, /health, /api/logs?limit=5

Env overrides: DEPLOY_HOST, DEPLOY_USER, DEPLOY_KEY, DEPLOY_DIR, API_BASE
EOF
}

run_ssh() {
  ssh -i "$KEY" -o StrictHostKeyChecking=no "${USER}@${HOST}" "$@"
}

local_commit_push() {
  echo "==> 로컬 변경사항을 origin/${BRANCH} 에 커밋/푸시합니다"

  # 변경이 없으면 건너뜀
  if git -C "$SCRIPT_DIR" diff --quiet && git -C "$SCRIPT_DIR" diff --cached --quiet; then
    echo "변경 없음: 커밋/푸시를 건너뜁니다"
    return
  fi

  git -C "$SCRIPT_DIR" add -A
  git -C "$SCRIPT_DIR" commit -m "working"
  git -C "$SCRIPT_DIR" push origin "$BRANCH"
}

cmd="${1:-}"
if [[ -z "$cmd" ]]; then
  usage
  exit 1
fi

case "$cmd" in
  status)
    run_ssh "systemctl status external-logger.service --no-pager"
    ;;
  restart)
    run_ssh "systemctl restart external-logger.service && systemctl status external-logger.service --no-pager"
    ;;
  logs)
    run_ssh "journalctl -u external-logger.service -n 100 --no-pager"
    ;;
  build-server)
    run_ssh "cd '$DIR/server' && npm install && npm run build"
    ;;
  build-client)
    run_ssh "cd '$DIR/client' && npm install && npm run build"
    ;;
  health)
    run_ssh "curl -I ${API_BASE} && echo && curl -s ${API_BASE}/health && echo && curl -s '${API_BASE}/api/logs?limit=5'"
    ;;
  deploy)
    # 1) 로컬에서 commit/push, 2) 원격에서 최신 main 강제 적용 후 빌드/재시작
    local_commit_push
    run_ssh "set -e; cd '$DIR'; git fetch --all; git reset --hard origin/${BRANCH}; cd client && npm install && npm run build; cd ../server && npm install && npm run build; systemctl restart external-logger.service"
    ;;
  *)
    usage
    exit 1
    ;;
esac
