#!/usr/bin/env bash
#
# Create a worktree for <branch> as an EXTERNAL SIBLING of this checkout (never nested),
# then run `pnpm dev:setup` inside it — the org's canonical worktree-creation entrypoint
# (`pnpm worktree:new`). Enforces the invariant: no active worktree lives inside another
# checkout.
#
# Sibling root resolution:
#   1. $CODE_WORKTREE_ROOT when CODE_WORKTREE_ROOT is set
#   2. else the parent directory of the primary checkout
# The worktree lands at <root>/worktrees/<repo-name>/<branch> (slashes in the branch become dashes).
#
# Usage: pnpm worktree:new <branch> [<base-ref>]
#
# PR checkout (e.g. `gh pr checkout` into a sibling worktree) is a deliberate extension
# point — add it here when a repo needs it; keep the external-sibling invariant.
#
set -euo pipefail

branch="${1:-}"
if [ -z "${branch}" ]; then
  echo "usage: pnpm worktree:new <branch> [<base-ref>]" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
repo_name="$(basename "${repo_root}")"

if [[ "${repo_root}" == */worktrees/*/* ]]; then
  repo_name="$(basename "$(dirname "${repo_root}")")"
fi

# Base ref: explicit arg, else the remote default branch, else origin/main, else main.
base="${2:-$(git -C "${repo_root}" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)}"
if [ -z "${base}" ]; then
  if git -C "${repo_root}" show-ref --verify --quiet refs/remotes/origin/main; then
    base="origin/main"
  else
    base="main"
  fi
fi

# Sibling root — external, never nested under the repo. If this script runs from an existing
# grouped worktree, climb back to the family root so nested creation does not compound.
if [ -n "${CODE_WORKTREE_ROOT:-}" ]; then
  family_root="${CODE_WORKTREE_ROOT%/}"
elif [[ "${repo_root}" == */worktrees/"${repo_name}"/* ]]; then
  family_root="${repo_root%%/worktrees/${repo_name}/*}"
else
  family_root="$(dirname "${repo_root}")"
fi
target="${family_root}/worktrees/${repo_name}/${branch//\//-}"

# Enforce the invariant: the target must not live under the current checkout.
case "${target}/" in
"${repo_root}"/*)
  echo "error: refusing to create a worktree nested under ${repo_root}." >&2
  echo "       set CODE_WORKTREE_ROOT to an external path, or run from a non-nested checkout." >&2
  exit 1
  ;;
esac

mkdir -p "$(dirname "${target}")"
echo "- creating worktree: ${target}  (branch ${branch} from ${base})"
git -C "${repo_root}" worktree add --no-track -b "${branch}" "${target}" "${base}"

# Run the canonical setup inside the new worktree when it exists; else a frozen install.
if (cd "${target}" && pnpm run 2>/dev/null | grep -q '^  dev:setup'); then
  (cd "${target}" && pnpm dev:setup)
else
  (cd "${target}" && pnpm install --frozen-lockfile)
fi

echo
echo "repo:    ${repo_name}"
echo "branch:  ${branch}"
echo "base:    ${base}"
echo "path:    ${target}"
echo "verify:  cd ${target} && pnpm check"
