# PHP Parser Schema Parity

Phase 0 of the codemod roadmap verifies that the TypeScript node interfaces in
`packages/php-json-ast/src/nodes/**` stay aligned with the upstream
[`PhpParser\Node`](https://github.com/nikic/PHP-Parser/tree/master/lib/PhpParser/Node)
classes. The WPKernel builder APIs rely on this parity so that JSON
payloads decoded inside PHP can flow back into the TypeScript helpers without
shape conversions.

## Node type mapping

Every exported interface that represents a concrete PHP node exposes a literal
`nodeType` string such as `Stmt_Class` or `Expr_Array`. The string matches the
value returned by `PhpParser\NodeAbstract::getType()`; the PHP driver uses that
key to choose the correct builder when it re-serialises the AST.

Most node interfaces mirror the upstream properties one-to-one. For example,
`PhpStmtClass` includes `name`, `extends`, `implements`, `stmts`, `flags`, and
`attrGroups`, which matches the payload returned by
`PhpParser\Node\Stmt\Class_::getSubNodeNames()`. Additional properties like
`namespacedName` surface metadata that PHP visitors may attach during
traversals-those fields are optional from the perspective of the parser and do
not appear in `getSubNodeNames()`.

## Automated parity checks

The Jest suite now ships with `nodeSchemaParity.test.ts`, which walks every node
interface, records its declared properties (including inherited ones), and then
invokes a PHP helper that reflects over Composer-installed `nikic/php-parser`
classes. The helper instantiates each node with `newInstanceWithoutConstructor()`
and captures the result of `getSubNodeNames()`.

During the test run we assert that each PHP sub node is present on the
corresponding TypeScript interface. If upstream adds a new field-for example, a
future `Stmt_Class` flag-the check will fail until we add the property to our
TypeScript definition.

Run `composer install` inside `packages/php-json-ast` to ensure the PHP classes
are available, then execute the package test suite:

```bash
pnpm --filter @wpkernel/php-json-ast test -- nodeSchemaParity.test.ts
```

## Manual auditing tips

When auditing a specific node:

1. Open the upstream class under
   `vendor/nikic/php-parser/lib/PhpParser/Node` and inspect the
   `$subNodeNames` declaration.
2. Cross-reference the matching interface in `src/nodes/**`. The file structure
   mirrors the PHP namespaces (`stmt`, `expressions`, `scalar`, etc.).
3. If you add new properties in TypeScript, update the relevant builders in
   `src/nodes/**` so that generated nodes remain exhaustive.

Documenting these conventions keeps the JSON bridge predictable and prepares the
groundwork for higher-level codemod helpers.
