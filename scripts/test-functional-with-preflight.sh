#!/usr/bin/env bash
set -euo pipefail

echo "Codecept execution is retired: all 23 historical contracts have Playwright replacements." >&2
echo "Use yarn test:functional. To deliberately exercise a known external CCD defect, set PLAYWRIGHT_INCLUDE_KNOWN_DEFECTS=true and run yarn test:playwright:e2e." >&2
exit 2
