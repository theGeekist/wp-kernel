# Framework Release Playbook

WP Kernel ships every package from a single source of truth. Releases are manual today-the old `release-please` workflow is on hold until we can automate the checks in this playbook. Follow the sequence below every time you cut a new version so the framework, showcase plugin, and documentation stay in sync.

## Preflight checklist

Start by confirming the repository is healthy:

- Verify `main` is green in CI and that the coverage gates (≥95% statements/lines, ≥98% functions) still pass locally.
- Run the full validation suite from the repository root: `pnpm lint --fix`, `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm test`, and `pnpm build`.
- Execute `pnpm release:verify` to run `scripts/check-release-readiness.ts`. It ensures every publishable workspace exposes `build`, `typecheck`, and `typecheck:tests` scripts and that all package versions match the root manifest before you tag.
- Review open pull requests to confirm no pending work needs to land in the same release window.

If any check fails, stop here and fix it in a regular feature branch. Releases only proceed once the tree is clean and reproducible.

## Align versions and changelog entries

WP Kernel uses fixed versioning across publishable packages. Run `pnpm release:bump <next-version>` to update the root manifest, every publishable workspace, and any documentation token that references the current release. The script finishes by rebuilding the docs site so the generated API reference reflects the new version number.

Update `CHANGELOG.md` entries at the root and in the affected package directories: move notes out of the `Unreleased` section, add the release date, and confirm highlights describe every merged feature.

When the code touches documentation beyond the generated artifacts, refresh the relevant guides under `/docs` in the same pull request. VitePress builds should still succeed after your edits.

## Build artifacts and dry-run publication

With versions and changelog entries staged:

1. Re-run `pnpm build` from the repository root. This step compiles each package and confirms the artifacts are present under `dist/`.
2. Run `pnpm release:prepare-pr` to confirm the working tree is clean, rebuild docs, and re-run the release readiness checks before you start staging changes.
3. Optionally run `pnpm --filter @wpkernel/* pack --dry-run` to inspect which files will publish. The dry run catches missing README/LICENSE files or stale build outputs.
4. Verify the showcase plugin still boots against the new build by running `pnpm wp:fresh` locally.

`pnpm release:prepare-pr` prints a diff summary at the end. Review the output before committing to ensure only generated artifacts, changelog entries, and version bumps are staged.

When the diff looks correct, open the release pull request and request a second maintainer to review the changelog and generated docs.

### Craft the release pull request

Every release PR must demonstrate that generated content and packaging outputs are in sync. Include the following in the description:

- A checklist showing `pnpm release:prepare-pr` completed successfully and that the rebuilt docs artifacts are committed.
- Links to the updated changelog entries at the root and in each affected workspace.
- A summary of the `pnpm --filter @wpkernel/* pack --dry-run` output so reviewers can confirm the published tarballs match expectations.
- An explicit reminder that a second maintainer must approve the PR before merging and that tags are pushed only after npm publishes succeed.

## Publish to npm and tag the release

Publish packages one at a time so failures are easy to roll back:

```bash
npm publish --workspace packages/core
npm publish --workspace packages/ui
npm publish --workspace packages/cli
npm publish --workspace packages/e2e-utils
npm publish --workspace packages/php-driver
npm publish --workspace packages/php-json-ast
npm publish --workspace packages/test-utils
```

Tag the release only after every package succeeds. Use annotated tags so the changelog is visible in Git history and defer pushing until npm publishes are complete:

```bash
git tag -a vX.Y.Z -m "WP Kernel vX.Y.Z"
git push origin main --tags
```

If you cut a prerelease, pass `--tag beta` (or similar) to each `npm publish` command and annotate the tag accordingly. Have the second reviewer confirm the npm output and the annotated tag before merging the release PR.

## Post-release verification

- Install each package in a clean project with `npm install @wpkernel/core@X.Y.Z` (repeat for every workspace) to confirm the published tarballs resolve.
- Run through the Quick Start in the documentation to ensure the CLI and generated assets still work with the released build.
- Announce the release internally with a link to the changelog entry, the annotated tag, and any migration callouts.

## Future automation

Automated npm publication remains a follow-up task. Once we trust this manual flow, the next step is a release script that runs the preflight checks, rebuilds docs, creates a release PR, and tags after a second maintainer approves. Track that effort under Task 4 of `RELEASE_PREPARATION.md` so the plan stays visible.
