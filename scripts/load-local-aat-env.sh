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
export REFORM_ENVIRONMENT="${REFORM_ENVIRONMENT:-aat}"
export IDAM_URL="${IDAM_URL:-https://idam-api.aat.platform.hmcts.net}"
export S2S_URL="${S2S_URL:-http://rpe-service-auth-provider-aat.service.core-compute-aat.internal}"
export DOCASSEMBLY_URL="${DOCASSEMBLY_URL:-http://dg-docassembly-aat.service.core-compute-aat.internal}"
export DM_STORE_APP_URL="${DM_STORE_APP_URL:-http://dm-store-aat.service.core-compute-aat.internal}"
export HRS_API_URL="${HRS_API_URL:-http://em-hrs-api-aat.service.core-compute-aat.internal}"
export ANNOTATION_API_URL="${ANNOTATION_API_URL:-http://em-anno-aat.service.core-compute-aat.internal}"
export NPA_URL="${NPA_URL:-http://em-npa-aat.service.core-compute-aat.internal}"
export ICP_API_URL="${ICP_API_URL:-https://em-icp.aat.platform.hmcts.net}"
export REDIRECT_URL="${REDIRECT_URL:-https://xui-media-viewer-aat.service.core-compute-aat.internal/oauth2/callback}"

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

export NODE_CONFIG="$(node -e "console.log(JSON.stringify({ secrets: { 'em-showcase': { 'show-oauth2-token': process.env.IDAM_SECRET, 'microservicekey-em-gw': process.env.S2S_KEY, password: process.env.IDAM_PASSWORD } } }))")"
