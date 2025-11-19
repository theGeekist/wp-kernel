# Readiness

Configure custom readiness helpers that join `wpk doctor` and command preflight checks:

- `helpers`: `Array<(ctx) => ReadinessHelper>` factories resolved when building the readiness registry.

Optional; not part of the IR fragments but used by CLI readiness orchestration. See [readiness in appendix](/reference/config/appendix#readiness).
