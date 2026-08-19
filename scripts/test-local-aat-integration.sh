#!/usr/bin/env bash
set -euo pipefail

env_file="${ENV_FILE:-.env}"

if [[ -f "${env_file}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${env_file}"
  set +a
fi

export TEST_TYPE=aat
export TEST_URL="${TEST_URL:-http://localhost:3000/}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-${TEST_URL}}"
export PLAYWRIGHT_SKIP_INSTALL="${PLAYWRIGHT_SKIP_INSTALL:-true}"
export INTEGRATION_TESTS_WORKERS=1

yarn test:playwright:integration "$@"
