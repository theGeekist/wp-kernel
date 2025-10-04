# Repository Handbook

A map of source-of-truth documents that live outside the `/docs` tree. Use this page as the hub when you need deeper operational or architectural guidance.

## Core References

| Document           | Purpose                                    | Canonical Source                                                                                 |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Project README     | High-level overview, packages, quick links | [README.md](https://github.com/theGeekist/wp-kernel/blob/main/README.md)                         |
| Development Guide  | Environment setup, workflows, tooling      | [DEVELOPMENT.md](https://github.com/theGeekist/wp-kernel/blob/main/DEVELOPMENT.md)               |
| Branching Strategy | Release cadence, git flow, merge policy    | [BRANCHING_STRATEGY.md](https://github.com/theGeekist/wp-kernel/blob/main/BRANCHING_STRATEGY.md) |
| Change Log         | Human-curated release notes                | [CHANGELOG.md](https://github.com/theGeekist/wp-kernel/blob/main/CHANGELOG.md)                   |
| Licensing          | EUPL-1.2 license terms                     | [LICENSE](https://github.com/theGeekist/wp-kernel/blob/main/LICENSE)                             |

::: info Canonical sources
The files linked above are the single source of truth. This page summarises them so you can jump straight to the authoritative document without hunting through the repository.
:::

## Package Handbooks

Each package ships with its own README. Review them when you work inside that package:

| Package                        | Highlights                                                | Canonical Source                                                                                               |
| ------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `@geekist/wp-kernel`           | Resource API, namespace detection, cache invalidation     | [packages/kernel/README.md](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/README.md)       |
| `@geekist/wp-kernel-ui`        | Component inventory, design tokens, storybook conventions | [packages/ui/README.md](https://github.com/theGeekist/wp-kernel/blob/main/packages/ui/README.md)               |
| `@geekist/wp-kernel-cli`       | Scaffolds, command usage, templates                       | [packages/cli/README.md](https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/README.md)             |
| `@geekist/wp-kernel-e2e-utils` | Playwright helpers, fixtures, testing patterns            | [packages/e2e-utils/README.md](https://github.com/theGeekist/wp-kernel/blob/main/packages/e2e-utils/README.md) |

## Additional Guides

- [AGENTS.md](https://github.com/theGeekist/wp-kernel/blob/main/AGENTS.md) — execution policy for automation agents
- [LICENSING.md](https://github.com/theGeekist/wp-kernel/blob/main/LICENSING.md) — rationale behind dual licensing choices
- [information/Roadmap](https://github.com/theGeekist/wp-kernel/blob/main/information/Roadmap%20PO%20%E2%80%A2%20v1.0.md) — product roadmap with sprint-by-sprint milestones
- [app/showcase README](https://github.com/theGeekist/wp-kernel/blob/main/app/showcase/README.md) — walkthrough of the example plugin

## Keeping Docs in Sync

- Treat the repository files as primary. Update them first, then reflect changes here.
- When you add a new Markdown guide outside `/docs`, add a link to it in this handbook to avoid drift.
- When a linked document changes materially, add a short note in the Change Log so downstream readers know to re-check it.

Need a document that is not listed here? Open a documentation issue and we will add it.
