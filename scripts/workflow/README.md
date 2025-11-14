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

## prerelease.ts

```
pnpm exec tsx scripts/workflow/prerelease.ts [options]
```

- Automates the hand-rolled prerelease flow directly on `${UPSTREAM_REMOTE:-upstream}/${UPSTREAM_BRANCH:-main}`.
- Computes the next semver (defaults to `prerelease` bumps with `beta` preid, use `--mode patch` for patch+beta.0) and fans it out to every workspace via `scripts/release/bump-version.ts`.
- Re-runs `pnpm docs:build` if the previous attempt failed so you can fix docs and resume without inventing a new semver.
- Creates the release commit + tag locally on a temporary branch cloned from `${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}`, and optionally pushes (`--push`) and publishes to npm (`--publish`, uses `--publish-tag` or the preid).
- Automatically stashes your current fork work (if dirty), switches to the upstream branch for the release, then restores your original branch and reminds you to `git stash pop` when finished.
- Stores the target semver in `.release-next-version` until the workflow completes so reruns stay idempotent.

Common flags:

```
--mode <prerelease|patch>   # default prerelease
--preid <beta>              # prerelease identifier
--remote <upstream>         # remote to push/tags
--branch <main>             # branch tracking upstream
--push                      # push branch + tag to upstream when done
--publish                   # pnpm -r publish --tag <preid>
--publish-tag <tag>         # override npm dist-tag (default preid)
--version <semver>          # explicitly set the next version/resume
```

Both scripts assume `origin` is your fork (theGeekist) and `upstream` is the public `wpkernel/wpkernel`. Adjust via environment variables when necessary.
