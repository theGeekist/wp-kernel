# Next-generation PHP builder guidelines

- Any introduction of string-based PHP builders (e.g., `PHP_INDENT`, template `.lines()` helpers, or manual string concatenation) will fail review immediately. Only pure AST construction is allowed for PHP emission.
- Maintain functional parity with legacy builders, but do not blindly copy logic that carried bugs. Recreate behaviour intentionally while keeping existing fixes intact.
- Implementations under `src/next` must prioritise correctness and completeness-ensure every builder and helper covers the full feature set expected from its legacy counterpart before shipping.
- Reserve the `create*` prefix for helpers built through `createHelper` or other pipeline factories. Functions that do not extend the pipeline must use alternative verbs (e.g., `build*`, `make*`) to avoid naming ambiguity, and alias third-party `create*` imports to another verb when used locally.
