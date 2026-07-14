#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(dirname "$0")/load-local-aat-env.sh"

yarn build:lib
yarn copy:lib-js-dependencies
yarn copy:lib-assets
yarn setup:api

yarn start:api &
api_pid=$!

cleanup() {
  kill "$api_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

yarn start:ng
