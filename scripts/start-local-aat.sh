#!/usr/bin/env bash
set -euo pipefail

env_file="${ENV_FILE:-.env}"

if [[ -f "$env_file" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
fi

export MV_USE_AAT="${MV_USE_AAT:-true}"

missing_required_env=0
for env_name in IDAM_SECRET IDAM_PASSWORD S2S_KEY; do
  if [[ -z "${!env_name:-}" ]]; then
    echo "Missing $env_name. Populate $env_file from an approved HMCTS secret source before starting AAT mode." >&2
    missing_required_env=1
  fi
done

if [[ "$missing_required_env" -ne 0 ]]; then
  exit 1
fi

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
