# AGENTS.md - @wpkernel/php-json-ast

## Scope

This guidance applies to all files within the `packages/php-json-ast/` directory tree.

## Package Invariants

- This package provides a **pure PHP AST transport layer**. It must remain WordPress-agnostic.
- Do **not** introduce WordPress-specific constructs, helpers, naming conventions, or types in this package.
- Any WordPress-specific behaviours or schema extensions belong in `packages/wp-json-ast/`.
- Keep shared tooling and error handling generic so it can be reused by non-WordPress consumers.

## Contributor Notes

- Update this file if additional invariants for the PHP AST layer are established.
- When in doubt about cross-package responsibilities, prefer adding abstractions in `@wpkernel/core` or higher-level packages instead of coupling to WordPress semantics here.
