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
export MV_SMOKE_PDF_DOCUMENT_ID="${MV_SMOKE_PDF_DOCUMENT_ID:-04666097-eb32-4b2b-9bec-8e9ce8057560}"
export MV_SMOKE_PDF_DOCUMENT_URL="${MV_SMOKE_PDF_DOCUMENT_URL:-/documents/${MV_SMOKE_PDF_DOCUMENT_ID}/binary}"
export MV_SMOKE_CASE_ID="${MV_SMOKE_CASE_ID:-local-aat-media-viewer}"

yarn test:playwright:smoke
