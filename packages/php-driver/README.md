# @wpkernel/php-driver

Shared PhpParser driver orchestration for WPKernel generators. This package exposes helpers for
verifying Composer dependencies, spawning the PHP pretty printer bridge, and integrating with the
pipeline runtime used by the CLI and other toolchains.

## Packaged assets

Published builds ship both the compiled JavaScript runtime under `dist/` and the PHP bridge assets
under `php/`. The CLI readiness suite packs the workspace (`pnpm --filter @wpkernel/php-driver pack`)
and inspects the resulting tarball to confirm that `php/pretty-print.php` is present alongside the
runtime entrypoints. This ensures the path resolved by `resolvePrettyPrintScriptPath` matches the
files developers receive when installing the package from the registry.

## Autoload resolution

The pretty printer prefers Composer autoloaders in the following order:

1. `WPK_PHP_AUTOLOAD` (explicit override for CI, Playground, or bespoke setups)
2. The workspace's own `vendor/autoload.php`
3. Entries from `WPK_PHP_AUTOLOAD_PATHS` (falling back to the legacy `PHP_DRIVER_AUTOLOAD_PATHS` when present)
4. Shared fallbacks bundled with the monorepo (CLI, `php-json-ast`, PHP driver)

If no autoload file provides `nikic/php-parser`, the bridge emits a structured failure trace and
instructs developers to reinstall the CLI or point `WPK_PHP_AUTOLOAD` at a valid autoloader path.
