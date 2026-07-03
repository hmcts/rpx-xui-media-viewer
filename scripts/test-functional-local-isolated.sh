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
export E2E_FAIL_FAST_PREFLIGHT="${E2E_FAIL_FAST_PREFLIGHT:-true}"

output_root="${E2E_PARALLEL_OUTPUT_ROOT:-functional-output/local-isolated}"
fixture_env="${MV_LOCAL_DOCUMENT_ENV_FILE:-.local-aat-documents.env}"
max_jobs="${MV_LOCAL_PARALLEL_MAX_JOBS:-3}"

pdf_features=(
  "annotationsAndComments.js"
  "bookMarks.js"
  "redact.js"
  "search.js"
  "printAndDownload.js"
  "rotate.js"
  "zoomAndnavigation.js"
)

image_features=(
  "imageViewerAnnotationsAndComments.js"
)

if [[ "${MV_CREATE_LOCAL_AAT_DOCS:-true}" == "true" ]]; then
  node scripts/create-local-aat-test-documents.js \
    --pdf-count "${#pdf_features[@]}" \
    --image-count "${#image_features[@]}" \
    --output "${fixture_env}" >/dev/null
fi

if [[ -f "${fixture_env}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${fixture_env}"
  set +a
fi

IFS=',' read -r -a pdf_ids <<< "${MV_FUNCTIONAL_PDF_DOCUMENT_IDS:-}"
IFS=',' read -r -a image_ids <<< "${MV_FUNCTIONAL_IMAGE_DOCUMENT_IDS:-}"

if [[ "${#pdf_ids[@]}" -lt "${#pdf_features[@]}" ]]; then
  echo "Need ${#pdf_features[@]} PDF document IDs, got ${#pdf_ids[@]}. Run yarn local-aat:documents or keep MV_CREATE_LOCAL_AAT_DOCS=true." >&2
  exit 1
fi

if [[ "${#image_ids[@]}" -lt "${#image_features[@]}" ]]; then
  echo "Need ${#image_features[@]} image document IDs, got ${#image_ids[@]}. Run yarn local-aat:documents or keep MV_CREATE_LOCAL_AAT_DOCS=true." >&2
  exit 1
fi

mkdir -p "${output_root}"
yarn puppeteer:install
node scripts/functional-preflight.js

declare -a batch_pids=()
declare -a batch_names=()
failed=0

run_feature() {
  local feature="$1"
  local document_id="$2"
  local image_document_id="$3"
  local output_dir="${output_root}/${feature%.js}"

  mkdir -p "${output_dir}"
  (
    export E2E_TEST_PATH="./mvFeatures/${feature}"
    export E2E_OUTPUT_DIR="${output_dir}"
    export MV_SMOKE_PDF_DOCUMENT_ID="${document_id}"
    export MV_SMOKE_IMAGE_DOCUMENT_ID="${image_document_id}"
    export MV_SMOKE_CASE_ID="local-aat-${feature%.js}-$$"
    NODE_PATH=. node ./node_modules/codeceptjs/bin/codecept.js run \
      -c ./test/end-to-end/ \
      --grep @ci \
      --steps \
      --reporter mocha-multi
  ) &
  batch_pids+=("$!")
  batch_names+=("${feature}")
}

wait_for_batch() {
  local index
  for index in "${!batch_pids[@]}"; do
    if wait "${batch_pids[$index]}"; then
      echo "Passed ${batch_names[$index]}"
    else
      echo "Failed ${batch_names[$index]}" >&2
      failed=1
    fi
  done
  batch_pids=()
  batch_names=()
}

for index in "${!pdf_features[@]}"; do
  run_feature "${pdf_features[$index]}" "${pdf_ids[$index]}" "${image_ids[0]}"
  if [[ "${#batch_pids[@]}" -ge "${max_jobs}" ]]; then
    wait_for_batch
  fi
done

for index in "${!image_features[@]}"; do
  run_feature "${image_features[$index]}" "${pdf_ids[0]}" "${image_ids[$index]}"
  if [[ "${#batch_pids[@]}" -ge "${max_jobs}" ]]; then
    wait_for_batch
  fi
done

if [[ "${#batch_pids[@]}" -gt 0 ]]; then
  wait_for_batch
fi

exit "${failed}"
