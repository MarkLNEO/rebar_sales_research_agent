#!/usr/bin/env bash
set -euo pipefail

echo "🧹 Cleaning local artifacts (reports, test outputs, dev logs)…"
rm -rf playwright-report test-results .next-dev.log || true
echo "✅ Done"

