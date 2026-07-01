#!/usr/bin/env bash
set -euo pipefail

env_file="${ENV_FILE:-.env}"

if [[ -f "${env_file}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${env_file}"
  set +a
fi

api_port="${PORT:-1337}"

curl -fsS http://localhost:3000/ >/dev/null
curl -fsS 'http://localhost:3000/#/media-viewer' >/dev/null
curl -fsS 'http://localhost:3000/#/dm-store' >/dev/null
curl -fsS "http://localhost:${api_port}/health" | grep -q '"status":"UP"'

echo "Local AAT media-viewer smoke passed."
