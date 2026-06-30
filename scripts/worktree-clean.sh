#!/usr/bin/env bash
#
# Remove a completed external sibling worktree and its local branch after merge.
# Canonical entrypoint: `pnpm worktree:clean <branch>`.
#
# The expected worktree path is <root>/worktrees/<repo-name>/<branch>, with slashes in the branch
# name converted to dashes. By default this refuses dirty worktrees and refuses cleanup while the
# matching remote branch still exists, because the org standard deletes merged branches remotely.
#
# Usage: pnpm worktree:clean <branch> [--force]
#
set -euo pipefail

branch="${1:-}"
force="false"

if [ -z "${branch}" ]; then
  echo "usage: pnpm worktree:clean <branch> [--force]" >&2
  exit 1
fi

if [ "${2:-}" = "--force" ]; then
  force="true"
elif [ -n "${2:-}" ]; then
  echo "error: unknown option: ${2}" >&2
  echo "usage: pnpm worktree:clean <branch> [--force]" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
repo_name="$(basename "${repo_root}")"
branch_slug="${branch//\//-}"

if [[ "${repo_root}" == */worktrees/*/* ]]; then
  repo_name="$(basename "$(dirname "${repo_root}")")"
fi

if [ -n "${CODE_WORKTREE_ROOT:-}" ]; then
  family_root="${CODE_WORKTREE_ROOT%/}"
elif [[ "${repo_root}" == */worktrees/"${repo_name}"/* ]]; then
  family_root="${repo_root%%/worktrees/${repo_name}/*}"
else
  family_root="$(dirname "${repo_root}")"
fi

target="${family_root}/worktrees/${repo_name}/${branch_slug}"

case "${target}/" in
"${repo_root}"/*)
  echo "error: refusing to clean a worktree nested under ${repo_root}." >&2
  echo "       set CODE_WORKTREE_ROOT to an external path, or run from a non-nested checkout." >&2
  exit 1
  ;;
esac

if [ ! -d "${target}" ]; then
  echo "error: worktree path does not exist: ${target}" >&2
  exit 1
fi

target_real="$(cd "${target}" && pwd -P)"
current_real="$(pwd -P)"
case "${current_real}/" in
"${target_real}"/*)
  echo "error: refusing to remove the current checkout. Run this from the primary checkout." >&2
  exit 1
  ;;
esac

target_branch="$(git -C "${target}" branch --show-current)"
if [ "${target_branch}" != "${branch}" ] && [ "${force}" != "true" ]; then
  echo "error: worktree is on branch '${target_branch}', not '${branch}'." >&2
  echo "       Pass --force only after verifying this is the intended checkout." >&2
  exit 1
fi
target_oid="$(git -C "${target}" rev-parse HEAD)"

if [ -n "$(git -C "${target}" status --porcelain)" ] && [ "${force}" != "true" ]; then
  echo "error: worktree has uncommitted changes: ${target}" >&2
  echo "       commit/stash them first, or pass --force if you intentionally want to discard them." >&2
  exit 1
fi

git -C "${repo_root}" fetch origin --prune

merged="false"
base_ref="$(git -C "${repo_root}" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
base_ref="${base_ref:-origin/main}"

if git -C "${repo_root}" merge-base --is-ancestor "${target_oid}" "${base_ref}" 2>/dev/null; then
  merged="true"
fi

if command -v gh >/dev/null 2>&1; then
  if (cd "${repo_root}" &&
    gh pr list --state merged --head "${branch}" --json headRefOid --jq '.[].headRefOid' 2>/dev/null |
      grep -Fxq "${target_oid}"); then
    merged="true"
  fi
fi

if git -C "${repo_root}" ls-remote --exit-code --heads origin "${branch}" >/dev/null 2>&1; then
  if [ "${force}" != "true" ]; then
    echo "error: origin/${branch} still exists." >&2
    echo "       The default cleanup path is for branches already merged and deleted remotely." >&2
    echo "       Pass --force only after verifying the branch is safe to remove." >&2
    exit 1
  fi
fi

if [ "${merged}" != "true" ] && [ "${force}" != "true" ]; then
  echo "error: could not verify that '${branch}' is merged." >&2
  echo "       Default cleanup requires merge evidence from git ancestry or a merged GitHub PR." >&2
  echo "       Pass --force only after verifying the branch is safe to remove." >&2
  exit 1
fi

echo "- removing worktree: ${target}"
if [ "${force}" = "true" ]; then
  git -C "${repo_root}" worktree remove --force "${target}"
else
  git -C "${repo_root}" worktree remove "${target}"
fi

if git -C "${repo_root}" show-ref --verify --quiet "refs/heads/${branch}"; then
  echo "- deleting local branch: ${branch}"
  git -C "${repo_root}" branch -D "${branch}"
else
  echo "- local branch already absent: ${branch}"
fi

git -C "${repo_root}" worktree prune

echo
echo "repo:   ${repo_name}"
echo "branch: ${branch}"
echo "path:   ${target}"
echo "verify: git -C ${repo_root} worktree list --porcelain"
