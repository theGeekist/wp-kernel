# PHP Parser Codemod & Utilities Plan

This roadmap captures how `@wpkernel/php-json-ast` can evolve now that `nikic/php-parser` ships with the package build. The TypeScript node interfaces we expose (`PhpNode`, `PhpStmt_*`, etc.) already mirror the PHP library's JSON schema, so we can hand real PHP nodes across the driver boundary, run codemods inside PHP, and persist the transformed tree back into the existing builder channel.

## Upstream surfaces to leverage

### Node shape parity

- Every PHP node inherits from `PhpParser\NodeAbstract`, which serialises to `{ nodeType, attributes, ... }`. That aligns with our base factories such as `buildNode` and utilities like `mergeNodeAttributes`, meaning a codemod can emit PHP nodes and let the existing TypeScript helpers consume them without shape conversion.
- The statement/type interfaces under `src/nodes/**` already expose properties like `flags`, `implements`, and `attrGroups`. Maintaining parity requires auditing upstream classes (for example `PhpParser\Node\Stmt\Class_`) whenever the PHP schema changes.

### JSON bridge & pretty printer

- The PHP driver script currently uses `PhpParser\JsonDecoder` to hydrate incoming JSON into native nodes, runs `PrettyPrinter\Standard`, and returns both formatted code and a re-encoded AST. That pipeline proves that a PHP-side transformation can round-trip safely while preserving attributes.
- The shared `createPhpProgramWriterHelper` drains the builder channel, invokes `buildPhpPrettyPrinter`, and writes both `*.php` files and `*.ast.json` snapshots. Any codemod outcome that conforms to `PhpProgram` can be flushed through this helper with no extra wiring.

### Traversal, analysis, and generation utilities

- `ParserFactory` can target specific PHP versions, letting us parse legacy inputs even when the host runtime moves forward.
- Visitors like `NameResolver` annotate or replace names in place, making it easy to normalise fully qualified symbols before we serialise back to TypeScript.
- `NodeTraverser` combined with `NodeFinder` supports structured searches ("find all class properties with `readonly`") and focused edits without rebuilding the tree by hand.
- `BuilderFactory` exposes higher-level constructors for namespaces, classes, methods, and traits. Using these builders inside codemods keeps complex node assembly within PHP where the upstream library can enforce invariants.
- `NodeDumper` renders human-readable trees (including flags and optional attributes), providing a debugging aid while validating that converted nodes still match our TypeScript expectations.

## Codemod architecture concept

1. Parse source using `ParserFactory::createForNewestSupportedVersion()` (or a version-specific factory when we need compatibility guarantees).
2. Run `NodeTraverser` with a stack of visitors: the built-in `NameResolver` for symbol normalisation, plus bespoke visitors for the migration at hand (for example, upgrading property hooks or injecting attributes).
3. Optionally compose new nodes with `BuilderFactory` to guarantee valid structures before insertion.
4. Serialise the resulting node array with `json_encode` (mirroring `NodeAbstract::jsonSerialize()`), or stream it back through the existing pretty-print bridge which already returns `{ code, ast }` payloads.
5. Feed the JSON into `createPhpProgramWriterHelper`, which persists the PHP artefacts and their `.ast.json` companions for CLI and workspace consumers.

## Phased roadmap

### Completion tracking

- **Phase rollup:** Update the status callout under each phase (Complete, In Progress, Planned) as milestones land.
- **Task status:** Use the per-task status callouts below to mark completion, link deliverables, and add follow-up notes.
- **After completion:** Replace pending placeholders with implementation details and artefact links as soon as work merges.
- **Change cadence:** Revisit this document whenever tasks or phases graduate, or when new deliverables are scoped, so downstream teams stay aligned.

### Completed phases

#### Phase 0 - Baseline verification

> **Status:** Complete

- [x] Document the TypeScript ↔ PHP schema mapping by cross-referencing `PhpParser\Node` classes with our `src/nodes/**` definitions. See [PHP Parser Schema Parity](./schema-parity.md).
- [x] Add automated checks (script or test harness) that diff upstream `Node::getSubNodeNames()` against our TypeScript interfaces to catch drift early. Covered by `nodeSchemaParity.test.ts` and the PHP reflection helper.
- [x] Extend developer docs with a quick-start on running the composer-backed driver locally (preparing the ground for codemod experimentation). Refer to [PHP Driver Quick-start](./driver-quickstart.md).

#### Phase 2 - Codemod execution framework

> **Status:** Complete

##### Task 4 - Register codemod stacks through the driver

> **Task status:** Complete – Codemod stacks now flow from TypeScript helpers into the PHP ingestion driver with validation and tests.

- The new [`driver/codemods.ts`](../src/driver/codemods.ts) module defines the `PhpCodemodConfiguration` contract, a default stack key, and helpers to serialise configuration payloads for the PHP bridge. The helper suite is covered in [`driver/codemods.test.ts`](../src/__tests__/driver/codemods.test.ts).
- [`php/ingest-program.php`](../php/ingest-program.php) now accepts an optional `--config <path>` argument. When provided, it resolves and validates the declared stacks, instantiates supported visitors (starting with the upstream `NameResolver`), and runs them through a single `NodeTraverser` pass before emitting AST payloads.
- [`ProgramIngestionTest`](../php/tests/ProgramIngestionTest.php) now exercises the codemod path: it asserts that `NameResolver` annotations appear in the streamed AST and that the driver fails fast on unknown visitor keys or invalid option types.
  _Expectation: A single driver invocation can execute a caller-specified visitor stack without manual script edits._

##### Task 5 - Ship a baseline codemod pack

> **Task status:** Complete – Baseline visitors for name canonicalisation and `use` grouping now ship with fixtures and end-to-end coverage.

- `php/Codemods/BaselineNameCanonicaliserVisitor.php` wraps PhpParser's `NameResolver` with sane defaults, while `SortUseStatementsVisitor.php` reorders class, function, and constant imports (including grouped declarations) deterministically.
- The new [`createBaselineCodemodConfiguration`](../src/codemods/baselinePack.ts) helper emits stack definitions targeting the baseline visitors, and `ProgramIngestionTest` plus the ingestion integration suite assert both AST and pretty-printed output against [`fixtures/codemods/BaselinePack.*`](../fixtures/codemods).
- TypeScript callers can serialise the configuration with [`serialisePhpCodemodConfiguration`](../src/driver/codemods.ts) to drive the PHP bridge; baseline coverage exercises success and failure paths for option validation.
  _Expectation: Contributors can opt into vetted visitor bundles and observe consistent transformations across runs._

##### Task 6 - Snapshot codemod outcomes for observability

> **Task status:** Complete – Codemod executions now emit before/after snapshots with reviewer-facing summaries.

- The PHP ingestion bridge records codemod diagnostics (pre/post programs plus visitor stack metadata) whenever the driver applies a stack from `serialisePhpCodemodConfiguration`.
- `createPhpProgramWriterHelper` persists `.codemod.before.ast.json`, `.codemod.after.ast.json`, and `.codemod.summary.txt` alongside the standard `.ast.json` file. The summary includes visitor identifiers, SHA hashes for each AST, and the first twenty structural differences so reviewers can triage changes without re-running the driver.
- `programWriter.test.ts` and the ingestion integration suite assert that the new artefacts are written, queued for CLI consumers, and match the streamed diagnostics end-to-end.
- Snapshotting is automatic-any CLI build that threads a codemod configuration through the writer will emit the diagnostics bundle. During review, diff the summary (and, if needed, the before/after AST files) to understand what changed.
  _Expectation: Every codemod execution leaves auditable artefacts that reviewers can diff without rerunning the pipeline._

### Active phases

#### Phase 1 - Ingestion scaffolding

> **Status:** Complete

##### Task 1 - Establish the parser ingestion bridge

> **Task status:** Complete – Delivered by [`php/ingest-program.php`](../php/ingest-program.php) with fixtures covered in [`php/tests/ProgramIngestionTest.php`](../php/tests/ProgramIngestionTest.php).

- Expose a PHP entry point that accepts file paths, routes them through `ParserFactory`, and streams each decoded node as JSON that already matches our `PhpProgram` surface.
- Keep the script co-located with the existing driver helpers so the CLI can reuse bootstrap logic (autoloading, binary overrides, temporary output paths) without branching.
- Guard the utility with PHPUnit coverage that snapshots namespace, modifier, and attribute metadata to prove the JSON payload preserves upstream attributes.
  _Expectation: The PHP driver can emit schema-faithful JSON for arbitrary files without breaking the current pretty-print path._

##### Task 2 - Land the TypeScript ingestion helper

> **Task status:** Complete – The helper and its end-to-end coverage are green.

- Add a consumer under `src/driver/**` that accepts the streamed JSON, hydrates `PhpProgram` builders, and forwards them to `createPhpProgramWriterHelper` with zero manual mapping.
- Provide Jest coverage that feeds representative payloads through the helper and asserts the writer flushes identical `.php` and `.ast.json` artefacts.
- Document the helper usage in the driver quick-start so contributors can round-trip fixtures locally.
  _Expectation: TypeScript callers can translate the raw PHP stream into queued `PhpProgram` entries in a single helper call._
  **Status:** ✓ Implemented in [`src/driver/programIngestion.ts`](../src/driver/programIngestion.ts), which streams JSON-line payloads into queued `PhpProgram` entries while preserving the writer metadata contract. [`programIngestion.integration.test.ts`](../src/__tests__/driver/programIngestion.integration.test.ts) now runs in full, with the PHP bridge falling back to the packaged Composer autoloader when the workspace lacks dependencies, and the workflow is documented in the [driver quick-start](./driver-quickstart.md#4-ingest-php-programs-from-typescript).

##### Task 3 - Capture ingestion fixtures and snapshots

> **Task status:** Complete – Shared fixtures anchor cross-runtime snapshots and round-trip validation.

- Introduce fixtures covering namespaces, class modifiers, doc comments, and attributes inside `fixtures/ingestion/**`.
- Snapshot the fixture round-trip in both PHPUnit and Jest to confirm attribute fidelity across the PHP ↔ TypeScript boundary.
- Record the validation procedure in this plan once green so future phases inherit the ingestion contract.
  _Expectation: Shared fixtures guarantee the ingestion bridge reproduces upstream metadata end-to-end._
  **Status:** ✓ Canonical fixtures now live under [`fixtures/ingestion/`](../fixtures/ingestion) with shared AST snapshots. `ProgramIngestionTest` decodes the PHP driver output and compares it to [`CodifiedController.ast.json`](../fixtures/ingestion/CodifiedController.ast.json), while [`programIngestion.integration.test.ts`](../src/__tests__/driver/programIngestion.integration.test.ts) hydrates the same fixture in its sandbox and verifies that the streamed payload, writer-emitted `.php`, and `.ast.json` artefacts exactly match the stored snapshots.

#### Phase 3 - Advanced utilities & debugging

> **Status:** In Progress

##### Task 7 - Expose `NodeFinder` query endpoints

> **Task status:** Complete – Baseline queries now execute through PHP and surface structured results to TypeScript helpers.

- `php/query-nodefinder.php` implements the read-only query command, wiring `PhpParser\NodeFinder` to the initial catalog (`class.readonly-properties`, `constructor.promoted-parameters`, `enum.case-lookups`) and emitting labelled JSON payloads per file.
- The TypeScript helper in [`queries/nodeFinder.ts`](../src/queries/nodeFinder.ts) defines the configuration/result schema, offers serialization utilities, and exposes the curated query keys to downstream tooling.
- End-to-end coverage in [`queries/nodeFinder.integration.test.ts`](../src/__tests__/queries/nodeFinder.integration.test.ts) boots the PHP script against [`fixtures/queries/NodeFinderTargets.php`](../fixtures/queries/NodeFinderTargets.php) to assert deterministic match counts and summaries for each baseline query.
  _Expectation: Teams can inventory AST hotspots programmatically before they schedule transformations._

##### Task 8 - Layer diagnostics and dumps

> **Task status:** Complete – Diagnostics mode now persists NodeDumper dumps with cross-runtime toggles and regression coverage.

- `persistCodemodDiagnostics` writes `.codemod.before.dump.txt` and `.codemod.after.dump.txt` alongside the existing JSON snapshots, normalising trailing newlines so automation can diff the results consistently.
- `php/ingest-program.php` accepts a `--diagnostics` flag and recognises `diagnostics.nodeDumps` in codemod configuration files. When enabled, codemod executions capture NodeDumper output (including flags, attributes, and replacements) for both the pre- and post-visitor trees.
- TypeScript consumers can toggle diagnostics through `PhpCodemodConfiguration.diagnostics`, and integration tests assert the dumps surface modifier flags and attribute payloads while mirroring the streamed diagnostics in the emitted files.
  _Expectation: Debug builds surface rich context (flags, attributes, replacements) whenever a codemod modifies the tree._

##### Task 9 - Prototype generation helpers with `BuilderFactory`

> **Task status:** Complete – Intent-driven generation flows now round-trip through PHP and TypeScript with fixture-backed parity.

- `php/generate-builderfactory.php` accepts intent manifests, feeds them through `BuilderFactory`, and emits ready-to-queue `PhpProgram` payloads (declare + namespace) without manual wiring.
- TypeScript surfaces the shared schema in [`generation/builderFactory.ts`](../src/generation/builderFactory.ts), including literal/argument helpers so pipelines can author intents ergonomically.
- Fixture coverage lives under [`fixtures/generation/`](../fixtures/generation) with [`builderFactory.integration.test.ts`](../src/__tests__/generation/builderFactory.integration.test.ts) asserting that PHP output matches the TypeScript factories and the stored AST snapshots.
  _Expectation: Structured generation tasks can stay inside PHP while still flowing through the shared writer helper._

### Upcoming phases

#### Phase 4 - CLI and pipeline adoption

> **Status:** Planned

##### Task 10 - Wire codemods into the CLI build pipeline

> **Task status:** Pending – Capture CLI integration notes and regression coverage when this work is complete.

- Teach the CLI builders to invoke the codemod driver when feature flags or project config requests it.
- Ensure pipeline options (PHP binary overrides, diagnostics toggles) thread cleanly from CLI configuration to the driver.
- Guard the new path with integration tests that verify non-codemod builds remain unchanged.
  _Expectation: CLI builds can opt into codemods without regressing existing projects._

##### Task 11 - Add end-to-end codemod regression coverage

> **Task status:** Pending – Record regression suite scope, fixtures, and failure-path handling post-delivery.

- Author integration tests that queue a migration, execute the codemod, and snapshot the resulting PHP + AST outputs.
- Include failure-path coverage (visitor throwing, diagnostics enabled) to ensure the CLI reports actionable errors.
- Record the required checks in the release checklist so codemod regressions surface before merges.
  _Expectation: Every CLI codemod path is guarded by reproducible tests that assert both success and failure flows._

##### Task 12 - Document rollout and contributor workflows

> **Task status:** Pending – Summarise documentation updates, migration notes, and contributor guidance once published.

- Update CLI docs, READMEs, and this plan with instructions for enabling codemods, selecting visitor packs, and reading diagnostics.
- Add troubleshooting guidance covering PHP version targeting, binary overrides, and snapshot diffs.
- Capture follow-up actions for downstream plugin authors (migration notes, changelog entries) once the CLI path ships.
  _Expectation: Contributors and plugin authors can adopt the codemod pipeline with clear guidance and support material._

Keep this plan in sync with upstream PHP-Parser releases and our CLI migration timeline. As we check off tasks, graduate each phase into the historical record (mirroring how the CLI docs archive completed efforts).
