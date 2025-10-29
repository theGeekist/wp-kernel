# Examples

See WP Kernel in action. Each example plugin is a working WordPress project that exercises a different slice of the framework-either the full showcase workflow or the focused CLI smoke test.

## Showcase plugin

A hiring portal that wires a `job` resource through the entire stack: REST controllers, React DataViews, and capability-aware actions. Follow the walkthrough in the [Showcase guide](/examples/showcase) to see how the kernel config drives the generated output.【F:examples/showcase/wpk.config.ts†L1-L340】

## Test the CLI

A trimmed project used by integration tests. It keeps only a transient-backed resource so you can observe how `wpk generate` and `wpk apply` behave without extra UI code.【F:examples/test-the-cli/wpk.config.ts†L1-L48】

More examples will land as additional features graduate from the packages directory. If you need a scenario covered, open an issue and describe the workflow-we keep the docs in lock-step with the repository.
