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

WP Kernel uses fixed versioning across publishable packages. Update the root `package.json` version, then mirror the same number in each workspace manifest under `packages/*`. Update `CHANGELOG.md` entries at the root and in the affected package directories: move notes out of the `Unreleased` section, add the release date, and confirm highlights describe every merged feature.

When the code touches documentation, refresh the relevant guides under `/docs` in the same pull request. VitePress builds should still succeed after your edits.

## Build artifacts and dry-run publication

With versions and changelog entries staged:

1. Re-run `pnpm build` from the repository root. This step compiles each package and confirms the artifacts are present under `dist/`.
2. Optionally run `pnpm --filter @wpkernel/* pack --dry-run` to inspect which files will publish. The dry run catches missing README/LICENSE files or stale build outputs.
3. Verify the showcase plugin still boots against the new build by running `pnpm wp:fresh` locally.

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

Push tags only after every package succeeds:

```bash
git tag -a vX.Y.Z -m "WP Kernel vX.Y.Z"
git push origin main --tags
```

If you cut a prerelease, pass `--tag beta` (or similar) to each `npm publish` command and annotate the tag accordingly.

## Post-release verification

- Install each package in a clean project with `npm install @wpkernel/core@X.Y.Z` (repeat for every workspace) to confirm the published tarballs resolve.
- Run through the Quick Start in the documentation to ensure the CLI and generated assets still work with the released build.
- Announce the release internally with a link to the changelog entry, the annotated tag, and any migration callouts.

## Future automation

Automated npm publication remains a follow-up task. Once we trust this manual flow, the next step is a release script that runs the preflight checks, rebuilds docs, creates a release PR, and tags after a second maintainer approves. Track that effort under Task 4 of `RELEASE_PREPARATION.md` so the plan stays visible.
