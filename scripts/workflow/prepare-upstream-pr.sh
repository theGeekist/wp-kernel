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

ensure_remote_branch() {
	local remote=$1
	local branch=$2
	if ! git show-ref --verify --quiet "refs/remotes/${remote}/${branch}"; then
		echo "Error: missing ${remote}/${branch}. Run 'git fetch ${remote} ${branch}' first." >&2
		exit 1
	}
}

summarize_commits() {
	git log --oneline "${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}..${FORK_REMOTE}/${FORK_BRANCH}" || true
}

require_binary git
require_clean_worktree

git fetch "${FORK_REMOTE}" "${FORK_BRANCH}"
git fetch "${UPSTREAM_REMOTE}" "${UPSTREAM_BRANCH}"
ensure_remote_branch "${FORK_REMOTE}" "${FORK_BRANCH}"
ensure_remote_branch "${UPSTREAM_REMOTE}" "${UPSTREAM_BRANCH}"

echo "Commits on ${FORK_REMOTE}/${FORK_BRANCH} not in ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}:"
summarize_commits

read -rp "Continue and open git's interactive rebase editor? [Y/n]: " confirm
if [[ $confirm =~ ^[Nn]$ ]]; then
	echo "Aborted."
	exit 0
fi

default_branch="pr/$(date +%Y%m%d)-${FORK_BRANCH}"
read -rp "Name for the new PR branch [${default_branch}]: " pr_branch
pr_branch=${pr_branch:-$default_branch}

if git show-ref --verify --quiet "refs/heads/${pr_branch}"; then
	echo "Error: branch '${pr_branch}' already exists. Choose another name." >&2
	exit 1
fi

echo "Creating branch '${pr_branch}' from ${FORK_REMOTE}/${FORK_BRANCH}..."
git checkout -b "${pr_branch}" "${FORK_REMOTE}/${FORK_BRANCH}" >/dev/null

cat <<EOF
Launching interactive rebase onto ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}.
Use git's todo editor to drop, reorder, or squash commits before opening your PR.
EOF

if ! git rebase -i "${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}"; then
	cat <<'EOF'
Interactive rebase stopped with conflicts.
Resolve issues, then run:
  git rebase --continue
or abort with:
  git rebase --abort
Once the rebase completes, re-run the remaining steps manually.
EOF
	exit 1
fi

echo "Rebase complete. Current branch: ${pr_branch}"
git status -sb

read -rp "Push '${pr_branch}' to ${FORK_REMOTE}? [y/N]: " push_choice
if [[ $push_choice =~ ^[Yy]$ ]]; then
	git push -u "${FORK_REMOTE}" "${pr_branch}"
	pushed=true
else
	pushed=false
fi

if [[ $pushed == true ]]; then
	if command -v gh >/dev/null 2>&1; then
		fork_url=$(git remote get-url "${FORK_REMOTE}")
		upstream_url=$(git remote get-url "${UPSTREAM_REMOTE}")
		parse_slug() {
			case "$1" in
				git@github.com:*) echo "${1#git@github.com:}" | sed 's/\.git$//' ;;
				https://github.com/*) echo "${1#https://github.com/}" | sed 's/\.git$//' ;;
				*) echo "" ;;
			esac
		}
		fork_slug=$(parse_slug "${fork_url}")
		upstream_slug=$(parse_slug "${upstream_url}")
		if [[ -n $fork_slug && -n $upstream_slug ]]; then
			read -rp "Open PR on ${upstream_slug} via GitHub CLI now? [y/N]: " pr_choice
			if [[ $pr_choice =~ ^[Yy]$ ]]; then
				gh pr create \
					--repo "${upstream_slug}" \
					--base "${UPSTREAM_BRANCH}" \
					--head "${fork_slug%/*}:${pr_branch}" \
					--fill
			fi
		else
			echo "Skipping automatic PR creation (non-GitHub remote)."
		fi
	else
		echo "Push complete. Create the PR in ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH} when ready."
	fi
else
	cat <<EOF
Branch '${pr_branch}' is ready locally.
Push it with:
  git push -u ${FORK_REMOTE} ${pr_branch}
Then open your PR targeting ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}.
EOF
fi
