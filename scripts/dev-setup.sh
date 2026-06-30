#!/usr/bin/env bash
#
# Prepare this checkout for local development — the org's canonical setup entrypoint
# (`pnpm dev:setup`). Idempotent and non-destructive: it never overwrites local env files.
#
# Baseline (below): validate Node against engines.node, enable Corepack, frozen install,
# print the package manager and pnpm store path. Add repo-specific steps in the marked
# section (env/seed copies, cache links, browser installs) as the repo grows — keep them
# idempotent and never clobber an existing env file. A docs-only repo where `pnpm install`
# is the whole story does not need this script.
#
set -euo pipefail

cd "$(dirname "$0")/.." # repo root

# 1. Node version vs engines.node (compatibility floor).
node_major="$(node -p 'process.versions.node.split(".")[0]')"
floor_major="$(node -p "((require('./package.json').engines||{}).node||'').match(/\d+/)?.[0]||''" 2>/dev/null || echo '')"
if [ -n "${floor_major}" ] && [ "${node_major}" -lt "${floor_major}" ]; then
  echo "error: Node ${node_major} is below the required floor >=${floor_major} (engines.node)." >&2
  exit 1
fi
echo "- node $(node -v) (engines.node floor: >=${floor_major:-unset})"

# 2. Toolchain: enable Corepack so the pinned pnpm in package.json is used.
corepack enable >/dev/null 2>&1 || echo "- warn: could not enable Corepack; ensure the pinned pnpm is on PATH"

# 3. Install dependencies with a frozen lockfile.
pnpm install --frozen-lockfile

# 4. Repo-specific setup goes here (env/seed copies, cache links, browser installs).
#    Keep it idempotent and never overwrite an existing env file.

# 5. Report.
echo "- package manager: $(node -p "require('./package.json').packageManager || 'unset'")"
echo "- pnpm store: $(pnpm store path 2>/dev/null || echo unknown)"
echo "Done. Next: pnpm check"
