#!/usr/bin/env bash
set -euo pipefail

yarn puppeteer:install

if [ "${E2E_FAIL_FAST_PREFLIGHT:-false}" = "true" ]; then
  node scripts/functional-preflight.js
else
  node scripts/functional-preflight.js || echo "Functional preflight failed; continuing with Codecept functional suite"
fi

NODE_PATH=. node ./node_modules/codeceptjs/bin/codecept.js run -c ./test/end-to-end/ --grep @ci --steps --reporter mocha-multi
