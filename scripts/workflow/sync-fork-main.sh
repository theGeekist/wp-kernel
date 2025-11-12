#!/usr/bin/env bash

set -euo pipefail

FORK_REMOTE=${FORK_REMOTE:-origin}
FORK_BRANCH=${FORK_BRANCH:-main}
UPSTREAM_REMOTE=${UPSTREAM_REMOTE:-upstream}
UPSTREAM_BRANCH=${UPSTREAM_BRANCH:-main}

require_binary() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Error: missing required command '$1'." >&2
		exit 1
	}
}

require_clean_worktree() {
	if [[ ${ALLOW_DIRTY:-0} != "1" ]]; then
		if ! git diff --quiet --ignore-submodules --cached || \
			! git diff --quiet --ignore-submodules; then
			echo "Error: working tree has changes. Commit or stash before continuing." >&2
			exit 1
		fi
	fi
}

ensure_branch_exists() {
	if ! git show-ref --verify --quiet "refs/heads/${FORK_BRANCH}"; then
		echo "Error: local branch '${FORK_BRANCH}' does not exist." >&2
		exit 1
	}
}

ensure_remote_branch() {
	local remote=$1
	local branch=$2
	if ! git show-ref --verify --quiet "refs/remotes/${remote}/${branch}"; then
		echo "Error: missing ${remote}/${branch}. Did you fetch it?" >&2
		exit 1
	}
}

require_binary git
require_clean_worktree

git fetch "${FORK_REMOTE}" "${FORK_BRANCH}"
git fetch "${UPSTREAM_REMOTE}" "${UPSTREAM_BRANCH}"
ensure_remote_branch "${FORK_REMOTE}" "${FORK_BRANCH}"
ensure_remote_branch "${UPSTREAM_REMOTE}" "${UPSTREAM_BRANCH}"
ensure_branch_exists

echo "Checking out ${FORK_BRANCH} and aligning with ${FORK_REMOTE}/${FORK_BRANCH}..."
git checkout "${FORK_BRANCH}"
git reset --hard "${FORK_REMOTE}/${FORK_BRANCH}"

ahead=$(git rev-list --oneline "${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}..${FORK_BRANCH}" || true)

if [[ -z $ahead ]]; then
	echo "No extra commits to preserve. Fast-forwarding ${FORK_BRANCH} to ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}."
	git reset --hard "${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}"
else
	echo "Commits on ${FORK_BRANCH} not yet in ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}:"
	echo "${ahead}"
	read -rp "Run interactive rebase to replay only the commits you still need? [Y/n]: " choice
	if [[ $choice =~ ^[Nn]$ ]]; then
		echo "Aborted."
		exit 0
	fi
	if ! git rebase -i "${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}"; then
		cat <<'EOF'
Interactive rebase stopped with conflicts.
Fix them, then run:
  git rebase --continue
or abort with:
  git rebase --abort
Re-run this script to finish the sync afterwards.
EOF
		exit 1
	fi
fi

echo "Local ${FORK_BRANCH} is now based on ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}."
git status -sb

read -rp "Force-push ${FORK_BRANCH} to ${FORK_REMOTE}? [y/N]: " push_choice
if [[ $push_choice =~ ^[Yy]$ ]]; then
	git push "${FORK_REMOTE}" "${FORK_BRANCH}:${FORK_BRANCH}" --force-with-lease
else
	cat <<EOF
Skipping push. When ready, sync the fork manually:
  git push ${FORK_REMOTE} ${FORK_BRANCH}:${FORK_BRANCH} --force-with-lease
EOF
fi

echo "Sync complete."
