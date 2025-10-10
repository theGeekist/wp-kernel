/**
 * Directory name where generated artifacts (PHP, types, etc.) are written.
 *
 * Relative to the workspace root. Kept as a constant so other modules
 * can reference it when constructing output paths.
 */
/**
 * Directory name used for generated artifacts (IR, caches, build outputs).
 *
 * This constant is intentionally package-local and used by the build and
 * code-generation helpers. Keeping it as a constant centralises naming so
 * tests can assert paths without hardcoding string literals.
 */
export const GENERATED_ROOT = 'generated';
