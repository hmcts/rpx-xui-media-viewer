#!/usr/bin/env bash
set -euo pipefail

yarn env:populate:aat

curl -fsS http://localhost:3000/ >/dev/null
curl -fsS 'http://localhost:3000/#/media-viewer' >/dev/null
curl -fsS 'http://localhost:3000/#/dm-store' >/dev/null
curl -fsS http://localhost:1337/health | grep -q '"status":"UP"'

echo "Local AAT media-viewer smoke passed."
