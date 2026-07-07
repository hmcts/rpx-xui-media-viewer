#!/usr/bin/env bash
set -euo pipefail

fixture_env="${MV_LOCAL_DOCUMENT_ENV_FILE:-.local-aat-documents.env}"
if [ -f "${fixture_env}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${fixture_env}"
  set +a
fi

if [ "${PUPPETEER_INSTALL_ALREADY_VERIFIED:-false}" != "true" ]; then
  yarn puppeteer:install
fi

if [ "${E2E_FAIL_FAST_PREFLIGHT:-false}" = "true" ]; then
  node scripts/functional-preflight.js
else
  node scripts/functional-preflight.js || echo "Functional preflight failed; continuing with Codecept functional suite"
fi

NODE_PATH=. node ./node_modules/codeceptjs/bin/codecept.js run -c ./test/end-to-end/ --grep "${E2E_GREP:-@ci}" --steps --reporter mocha-multi
