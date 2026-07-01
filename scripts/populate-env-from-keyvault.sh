#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-aat}"
OUT_FILE="${2:-.env}"
TEMPLATE_FILE="${3:-.env.example}"

case "${ENVIRONMENT}" in
  aat|AAT)
    VAULT="rpx-aat"
    ;;
  *)
    echo "Usage: $0 [aat] [output_file] [template_file]"
    exit 1
    ;;
esac

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is required. Install it and run 'az login' first."
  exit 1
fi

if [[ ! -f "${TEMPLATE_FILE}" ]]; then
  echo "Template file not found: ${TEMPLATE_FILE}"
  exit 1
fi

secret_name_for_key() {
  case "$1" in
    IDAM_SECRET) echo "show-oauth2-token" ;;
    IDAM_PASSWORD) echo "password" ;;
    S2S_KEY) echo "microservicekey-em-gw" ;;
    *) echo "" ;;
  esac
}

secret_value() {
  az keyvault secret show \
    --vault-name "${VAULT}" \
    --name "$1" \
    --query value \
    -o tsv 2>/dev/null || true
}

tmp_file="$(mktemp "${OUT_FILE}.XXXXXX")"
trap 'rm -f "${tmp_file}"' EXIT

echo "Populating ${OUT_FILE} using ${VAULT} and template ${TEMPLATE_FILE}"

while IFS= read -r line || [[ -n "${line}" ]]; do
  if [[ -z "${line}" || "${line}" == \#* || "${line}" != *=* ]]; then
    echo "${line}" >> "${tmp_file}"
    continue
  fi

  key="${line%%=*}"
  secret_name="$(secret_name_for_key "${key}")"

  if [[ -z "${secret_name}" ]]; then
    echo "${line}" >> "${tmp_file}"
    continue
  fi

  value="$(secret_value "${secret_name}")"
  if [[ -z "${value}" ]]; then
    echo "Warning: ${secret_name} was not populated from ${VAULT}; ${key} left blank." >&2
  fi
  printf '%s=%q\n' "${key}" "${value}" >> "${tmp_file}"
done < "${TEMPLATE_FILE}"

mv "${tmp_file}" "${OUT_FILE}"
trap - EXIT

echo "Done. Generated ${OUT_FILE}"
