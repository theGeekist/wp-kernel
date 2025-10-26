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

- Document the TypeScript ↔ PHP schema mapping by cross-referencing `PhpParser\Node` classes with our `src/nodes/**` definitions.
- Add automated checks (script or test harness) that diff upstream `Node::getSubNodeNames()` against our TypeScript interfaces to catch drift early.
- Extend developer docs with a quick-start on running the composer-backed driver locally (preparing the ground for codemod experimentation).

### Phase 1 - Ingestion scaffolding

- Implement a PHP utility (exposed through the driver) that loads arbitrary PHP files, decodes them with `ParserFactory`, and emits raw JSON suitable for `PhpProgram` construction.
- Build complementary TypeScript helpers that accept the JSON stream and populate the builder channel without manual mapping.
- Provide fixtures covering namespaces, class modifiers, attributes, and doc comments to confirm attribute fidelity.

### Phase 2 - Codemod execution framework

- Design a visitor registration system (probably PHP-first) that lets TypeScript choose which codemod scripts to run before pretty-printing.
- Package reusable visitors for common refactors (e.g., a `NameResolver` + custom visitor bundle that canonicalises import groups to match our `PhpStmtUse` layout).
- Ensure codemod output is observable from TypeScript by recording before/after AST snapshots in the workspace (leveraging the existing `.ast.json` writer).

### Phase 3 - Advanced utilities & debugging

- Integrate `NodeFinder`-powered search helpers that TypeScript can invoke via the driver for read-only analyses (auditing hotspots before a codemod runs).
- Offer a diagnostics mode that pipes transformed nodes through `NodeDumper` and stores the textual dump alongside the JSON artefact for debugging.
- Explore PHP-side generation stories using `BuilderFactory` to scaffold new classes or methods, returning them as ready-made `PhpProgram` payloads.

### Phase 4 - CLI and pipeline adoption

- Wire the codemod entry points into the CLI's next-generation pipeline so projects can opt-in during builds (with feature flags or configuration hooks).
- Capture regression tests that execute end-to-end: queue a migration, run the codemod, pretty-print via the driver, and assert on emitted PHP/AST pairs.
- Update `packages/cli/docs` and package READMEs to explain how to run codemods, how to supply PHP version targets, and how diagnostics integrate with the CLI reporter.

Keep this plan in sync with upstream PHP-Parser releases and our CLI migration timeline. As we check off tasks, graduate each phase into the historical record (mirroring how the CLI docs archive completed efforts).
