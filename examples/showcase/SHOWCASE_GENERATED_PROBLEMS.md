# Showcase Generated Problems

## Commands Run

- `pnpm --filter wp-kernel-showcase run generate`
- `pnpm --filter wp-kernel-showcase run build`
- `pnpm --filter wp-kernel-showcase run apply`
- `pnpm --filter wp-kernel-showcase run typecheck`
- `pnpm exec vite build`
- `php -l inc/rest/JobController.php`
- `php -l .generated/php/Rest/JobController.php`

## PHP Generation Defects

- **Syntax errors** - `.generated/php/Rest/JobController.php:181` and `inc/rest/JobController.php:181` still emit `continue` statements outside a loop plus placeholder `empty(${variable})`, so the generated controller fails `php -l` and bricks `wpk apply`.

## TypeScript / TSX Generation Defects

- **Undefined identifiers** - `.generated/ui/app/job/admin/JobsAdminScreen.tsx:22` throws a `KernelError` without importing it, and the error payload references `resourceName` which is not defined anywhere in the file.
- **Incomplete fixture helpers** - `.generated/ui/fixtures/dataviews/job.ts:51` and :96 reference `jobStatusLabels`, `toTrimmedString`, `resolveStatus`, and `assignStringFilter` without defining or importing them. As soon as the file gets type-checked it will fail with `cannot find name` errors.
- **Silent coverage gap** - `tsconfig.json:24` only includes `.generated/types/**/*.d.ts`, so the UI artefacts under `.generated/ui/**` are never type-checked. That’s why the missing identifiers above do not surface during `pnpm --filter wp-kernel-showcase run typecheck`.
- **Runtime aliasing** - `.generated/ui/app/job/admin/JobsAdminScreen.tsx:5` deep-imports local source via `@/bootstrap/kernel`, but the generated plugin’s published TypeScript config resolves `@/*` to monorepo sources (tsconfig.json:10-21). Outside the workspace, these aliases break resolution and the bundle fails.
- **React runtime mismatch** - `tsconfig.json:8` forces `jsxImportSource: "react"` while the scaffolded `package.json` does not declare `react` or `react-dom`. The generated TSX relies on WordPress’ element package at runtime, so this mismatch will throw when consumers install the scaffold in isolation.

## Testing Strategy Gaps

- **Existing coverage** - PHP printers have focused unit suites (`packages/cli/src/printers/php/__tests__/**`) and an integration snapshot in `packages/cli/src/printers/__tests__/emit-generated-artifacts.test.ts`. CLI command suites (`packages/cli/src/commands/__tests__/…`) exercise `runGenerate` via mocks but exit before any generated artefact is linted or compiled.
- **What slipped through**
    - Printer tests assert string equality only; none shell out to `php -l`, so syntax errors like the illegal `continue;` and `${variable}` placeholder survive.
    - Generated TS/TSX artefacts are snapshot-checked but never compiled, so missing imports in `.generated/ui/app/job/admin/JobsAdminScreen.tsx` went unnoticed.
    - Scaffolded workspace configs aren’t validated end-to-end; no test runs `wpk init` and then executes the generated `pnpm run typecheck`/`build`, so alias drift and missing dependencies slip past.

This problem log feeds into the next-generation CLI architecture captured in `packages/cli/docs/cli-migration-phases.md`, which tackles the systemic issues highlighted above.
