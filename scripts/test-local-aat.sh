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
export E2E_TEST_PATH="${E2E_TEST_PATH:-./mvFeatures/localAatSmoke.js}"
export MV_SMOKE_PDF_DOCUMENT_ID="${MV_SMOKE_PDF_DOCUMENT_ID:-04666097-eb32-4b2b-9bec-8e9ce8057560}"

yarn puppeteer:install
NODE_PATH=. node ./node_modules/codeceptjs/bin/codecept.js run \
  -c ./test/end-to-end/codecept.smoke.conf.js \
  --grep @local-aat \
  --steps \
  --reporter mocha-multi
