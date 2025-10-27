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

### Phase 0 - Baseline verification

- [x] Document the TypeScript ↔ PHP schema mapping by cross-referencing `PhpParser\Node` classes with our `src/nodes/**` definitions. See [PHP Parser Schema Parity](./schema-parity.md).
- [x] Add automated checks (script or test harness) that diff upstream `Node::getSubNodeNames()` against our TypeScript interfaces to catch drift early. Covered by `nodeSchemaParity.test.ts` and the PHP reflection helper.
- [x] Extend developer docs with a quick-start on running the composer-backed driver locally (preparing the ground for codemod experimentation). Refer to [PHP Driver Quick-start](./driver-quickstart.md).

### Phase 1 - Ingestion scaffolding

#### Task 1 - Establish the parser ingestion bridge

- Expose a PHP entry point that accepts file paths, routes them through `ParserFactory`, and streams each decoded node as JSON that already matches our `PhpProgram` surface.
- Keep the script co-located with the existing driver helpers so the CLI can reuse bootstrap logic (autoloading, binary overrides, temporary output paths) without branching.
- Guard the utility with PHPUnit coverage that snapshots namespace, modifier, and attribute metadata to prove the JSON payload preserves upstream attributes.
  _Expectation: The PHP driver can emit schema-faithful JSON for arbitrary files without breaking the current pretty-print path._
  **Status:** ✓ Delivered by [`php/ingest-program.php`](../php/ingest-program.php) with fixtures covered in [`php/tests/ProgramIngestionTest.php`](../php/tests/ProgramIngestionTest.php).

#### Task 2 - Land the TypeScript ingestion helper

- Add a consumer under `src/driver/**` that accepts the streamed JSON, hydrates `PhpProgram` builders, and forwards them to `createPhpProgramWriterHelper` with zero manual mapping.
- Provide Jest coverage that feeds representative payloads through the helper and asserts the writer flushes identical `.php` and `.ast.json` artefacts.
- Document the helper usage in the driver quick-start so contributors can round-trip fixtures locally.
  _Expectation: TypeScript callers can translate the raw PHP stream into queued `PhpProgram` entries in a single helper call._
  **Status:** ✓ Implemented in [`src/driver/programIngestion.ts`](../src/driver/programIngestion.ts), which streams JSON-line payloads into queued `PhpProgram` entries while preserving the writer metadata contract. Covered end-to-end in [`src/__tests__/driver/programIngestion.test.ts`](../src/__tests__/driver/programIngestion.test.ts) (currently red while we resolve the pretty-printer exit 255 regression noted in the test TODOs) and documented for contributors in the [driver quick-start](./driver-quickstart.md#4-ingest-php-programs-from-typescript).

#### Task 3 - Capture ingestion fixtures and snapshots

- Introduce fixtures covering namespaces, class modifiers, doc comments, and attributes inside `fixtures/ingestion/**`.
- Snapshot the fixture round-trip in both PHPUnit and Jest to confirm attribute fidelity across the PHP ↔ TypeScript boundary.
- Record the validation procedure in this plan once green so future phases inherit the ingestion contract.
  _Expectation: Shared fixtures guarantee the ingestion bridge reproduces upstream metadata end-to-end._
  **Status:** ✓ Canonical fixtures now live under [`fixtures/ingestion/`](../fixtures/ingestion) with shared AST snapshots. `ProgramIngestionTest` decodes the PHP driver output and compares it to [`CodifiedController.ast.json`](../fixtures/ingestion/CodifiedController.ast.json), while [`programIngestion.test.ts`](../src/__tests__/driver/programIngestion.test.ts) copies the same fixture into its sandbox and asserts that both the streamed payload and writer outputs match the stored snapshot.

### Phase 2 - Codemod execution framework

#### Task 4 - Register codemod stacks through the driver

- Design a configuration contract that lets TypeScript declare ordered visitor stacks before pretty-printing begins.
- Thread the configuration through the PHP entry point so visitors can be resolved, instantiated, and attached to a single `NodeTraverser` run.
- Cover error handling (unknown visitor keys, invalid options) with focused PHP unit tests.
  _Expectation: A single driver invocation can execute a caller-specified visitor stack without manual script edits._

#### Task 5 - Ship a baseline codemod pack

- Implement a starter library of visitors (name canonicalisation, import grouping) under `php/Codemods/**`.
- Provide TypeScript shims that serialize the visitor selection and options, keeping naming consistent between the two runtimes.
- Exercise the pack with fixtures that show before/after AST payloads and corresponding pretty-printed PHP output.
  _Expectation: Contributors can opt into vetted visitor bundles and observe consistent transformations across runs._

#### Task 6 - Snapshot codemod outcomes for observability

- Extend the writer helper tests to capture pre/post AST snapshots whenever a codemod runs.
- Persist human-readable diagnostics (diffs or summaries) alongside the `.ast.json` outputs for local debugging.
- Document how to enable the snapshots in the CLI pipeline and how to interpret failures during review.
  _Expectation: Every codemod execution leaves auditable artefacts that reviewers can diff without rerunning the pipeline._

### Phase 3 - Advanced utilities & debugging

#### Task 7 - Expose `NodeFinder` query endpoints

- Add read-only query commands that execute common `NodeFinder` searches (e.g., locate readonly properties) and return structured JSON.
- Wire TypeScript helpers that call the queries before codemods to scope upcoming work.
- Validate the responses against curated fixtures so schema drift is caught immediately.
  _Expectation: Teams can inventory AST hotspots programmatically before they schedule transformations._

#### Task 8 - Layer diagnostics and dumps

- Introduce a diagnostics mode that pipes transformed nodes through `NodeDumper` and archives the output next to the existing JSON artefacts.
- Surface toggles in both PHP and TypeScript so the mode can run in CI or local experiments without code edits.
- Add smoke tests ensuring diagnostics capture flags, attributes, and replacements accurately.
  _Expectation: Debug builds surface rich context (flags, attributes, replacements) whenever a codemod modifies the tree._

#### Task 9 - Prototype generation helpers with `BuilderFactory`

- Create PHP-side helpers that scaffold namespaces, classes, and methods via `BuilderFactory` based on TypeScript-provided intents.
- Return the generated nodes as ready-made `PhpProgram` payloads so the TypeScript pipeline can persist them without extra wiring.
- Cover the generation flows with fixtures that compare the emitted AST against our TypeScript factories for parity.
  _Expectation: Structured generation tasks can stay inside PHP while still flowing through the shared writer helper._

### Phase 4 - CLI and pipeline adoption

#### Task 10 - Wire codemods into the CLI build pipeline

- Teach the next-generation CLI builders to invoke the codemod driver when feature flags or project config requests it.
- Ensure pipeline options (PHP binary overrides, diagnostics toggles) thread cleanly from CLI configuration to the driver.
- Guard the new path with integration tests that verify non-codemod builds remain unchanged.
  _Expectation: CLI builds can opt into codemods without regressing existing projects._

#### Task 11 - Add end-to-end codemod regression coverage

- Author integration tests that queue a migration, execute the codemod, and snapshot the resulting PHP + AST outputs.
- Include failure-path coverage (visitor throwing, diagnostics enabled) to ensure the CLI reports actionable errors.
- Record the required checks in the release checklist so codemod regressions surface before merges.
  _Expectation: Every CLI codemod path is guarded by reproducible tests that assert both success and failure flows._

#### Task 12 - Document rollout and contributor workflows

- Update CLI docs, READMEs, and this plan with instructions for enabling codemods, selecting visitor packs, and reading diagnostics.
- Add troubleshooting guidance covering PHP version targeting, binary overrides, and snapshot diffs.
- Capture follow-up actions for downstream plugin authors (migration notes, changelog entries) once the CLI path ships.
  _Expectation: Contributors and plugin authors can adopt the codemod pipeline with clear guidance and support material._

Keep this plan in sync with upstream PHP-Parser releases and our CLI migration timeline. As we check off tasks, graduate each phase into the historical record (mirroring how the CLI docs archive completed efforts).
