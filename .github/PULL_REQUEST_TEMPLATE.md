## Summary

Concise headline mapped to the MVP task(s). Example: “Task 5: Block Builder AST implementation — manifests, registrar, render templates”.

## Scope

**Task IDs:** <!-- e.g., 5, 6; see docs/internal/cli-mvp-plan.md -->
**Scope:** actions · policy · resource · data · reporter · ui · cli · e2e

## Links

- Roadmap section: <!-- link to the section in your docs site or repo -->
- Sprint doc / spec: <!-- link to sprint notes/spec for this PR -->
- Related issues: <!-- #123, #456 -->
- Demo/preview (if any): <!-- URL -->

## Why

Problem/use-case. What changes for users (devs)?

## What

Top-level bullets of what’s shipped in this PR.

## How

High-level approach. Note any trade-offs, alternatives considered, or TODOs deferred.

## Testing

How reviewers test locally:

1. …
2. …
   **Expected:** …

### Test Matrix (tick what’s covered)

- [ ] Unit (pnpm test)
- [ ] E2E (pnpm e2e)
- [ ] Types (pnpm typecheck)
- [ ] Docs examples (build/run)
- [ ] WordPress playground / wp-env sanity

## Screenshots / Recordings (if applicable)

Attach visuals for UI-facing changes.

## Breaking Changes

- [ ] None  
       If any, list migration steps with code snippets.

## Affected Packages

Tick any public packages this PR changes functionally.

- [ ] `@wpkernel/core`
- [ ] `@wpkernel/ui`
- [ ] `@wpkernel/cli`
- [ ] `@wpkernel/e2e-utils`
- [ ] `@wpkernel/php-driver`
- [ ] `@wpkernel/php-json-ast`
- [ ] `@wpkernel/test-utils`

## Release

Choose one and document in CHANGELOG.md files.

- [ ] **patch** — bugfixes / alignment (0.x.1)
- [ ] **minor** — feature sprint (default) (0.x.0)
- [ ] **major** — breaking API (x.0.0)

> Update CHANGELOG.md files in affected packages with summary of changes.
>
> _If infra/docs-only, add label **no-release**._

## Checklist

- [ ] No string-based generator was introduced or wrapped (PHP/blocks emitters remain AST-first).
- [ ] Tests pass (`pnpm test`, where relevant: `pnpm e2e`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Types pass (`pnpm typecheck`, `pnpm typecheck:tests`)
- [ ] CHANGELOG.md updated in affected packages (or PR labelled `no-release`)
- [ ] Docs updated (site/README)
- [ ] Examples updated (if API changed)
- [ ] Tests are green (unit, integration, E2E if applicable).
- [ ] Coverage maintained or improved (≥95% statements/lines, ≥98% functions).
- [ ] Documentation under `docs/internal/` (index, migration phases, tasks) updated if behaviour changed.
- [ ] Roadmap/spec updated if scope changed.
