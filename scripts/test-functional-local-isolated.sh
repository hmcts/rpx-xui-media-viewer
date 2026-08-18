#!/usr/bin/env bash
set -euo pipefail

env_file="${ENV_FILE:-.env}"
if [[ -f "${env_file}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${env_file}"
  set +a
fi

export TEST_URL="${TEST_URL:-http://localhost:3000/}"
exec yarn test:playwright:functional "$@"
