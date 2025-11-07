# @wpkernel/php-driver

Shared PhpParser driver orchestration for WPKernel generators. This package exposes helpers for
verifying Composer dependencies, spawning the PHP pretty printer bridge, and integrating with the
pipeline runtime used by the CLI and other toolchains.

## Autoload resolution

The pretty printer prefers Composer autoloaders in the following order:

1. `WPK_PHP_AUTOLOAD` (explicit override for CI, Playground, or bespoke setups)
2. The workspace's own `vendor/autoload.php`
3. Entries from `WPK_PHP_AUTOLOAD_PATHS` (falling back to the legacy `PHP_DRIVER_AUTOLOAD_PATHS` when present)
4. Shared fallbacks bundled with the monorepo (CLI, `php-json-ast`, PHP driver)

If no autoload file provides `nikic/php-parser`, the bridge emits a structured failure trace and a
helpful error suggesting `composer install` or setting `WPK_PHP_AUTOLOAD`.
