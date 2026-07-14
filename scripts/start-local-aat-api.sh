#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(dirname "$0")/load-local-aat-env.sh"

yarn setup:api
exec yarn start:api
