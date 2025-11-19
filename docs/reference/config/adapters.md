# Adapters

Adapter factories let you customise generation:

- `php`: `(ctx) => PhpAdapterConfig` to override namespaces, autoload paths, or inject AST tweaks.
- `extensions`: `Array<(ctx) => Extension>` to hook into the pipeline before/while building.

These are optional and consumed by the CLI during generation. See [adapters in appendix](/reference/config/appendix#adapters).
