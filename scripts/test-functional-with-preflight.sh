#!/usr/bin/env bash
set -euo pipefail

yarn puppeteer:install
node scripts/functional-preflight.js

NODE_PATH=. node ./node_modules/codeceptjs/bin/codecept.js run -c ./test/end-to-end/ --grep @ci --steps --reporter mocha-multi
