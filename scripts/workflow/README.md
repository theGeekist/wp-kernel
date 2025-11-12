# Private workflow helpers

Keep this directory local-only. These scripts automate the fork → upstream flow without exposing internal process docs.

## prepare-upstream-pr.sh

```
scripts/workflow/prepare-upstream-pr.sh
```

- Fetches `${FORK_REMOTE:-origin}`/`${FORK_BRANCH:-main}` and `${UPSTREAM_REMOTE:-upstream}`/`${UPSTREAM_BRANCH:-main}`.
- Shows the commits unique to the fork and then launches a standard `git rebase -i upstream/main` so you can curate what goes into the PR.
- Creates a scratch branch (defaults to `pr/<date>-main`), pushes to your fork, and optionally opens a PR via `gh pr create`.
- Set `ALLOW_DIRTY=1` to skip the clean-tree guard if you really need to run it mid-work.

## sync-fork-main.sh

```
scripts/workflow/sync-fork-main.sh
```

- After upstream merges/squashes, run this to rebase `origin/main` back onto `${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}`.
- It resets local `main` to `origin/main`, lists any commits not in upstream, and (if needed) drives an interactive rebase.
- Finishes by optionally force-pushing the cleaned branch back to the fork so it matches upstream history.
- Accepts the same env knobs (`FORK_*`, `UPSTREAM_*`, `ALLOW_DIRTY`) for custom setups.

Both scripts assume `origin` is your fork (theGeekist) and `upstream` is the public `wpkernel/wpkernel`. Adjust via environment variables when necessary.
