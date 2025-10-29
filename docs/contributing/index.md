# Contributing

Thanks for helping shape WP Kernel. This page is the entry point for maintainers and contributors alike: it explains how we work, where the canonical references live, and which guides to read next.

## Start here

Set up your environment with [Development Setup](/contributing/setup). It covers Node, pnpm, WordPress Playground, and the scripts that keep the monorepo tidy. Once you can run `pnpm test` locally, skim the [Runbook](/contributing/runbook) for daily tasks such as rebuilding the playground, running lint fixes, or generating typed docs.

## Working with issues and PRs

Open issues with clear context (what problem, why now, proposed direction). Pull requests should be focused, include tests or docs, and follow our CLI-driven workflow:

1. Create a branch.
2. Make the change and update relevant docs or specs.
3. Run `pnpm lint --fix`, `pnpm typecheck`, `pnpm typecheck:tests`, and `pnpm test`.
4. Commit using Conventional Commit messages (`docs(guide): clarify block bindings`).
5. Open a PR referencing the roadmap item or issue it supports.

We do not accept `git commit --no-verify`; let the hooks run to keep formatting and coverage consistent.

## Repository map

Use this checklist when you need the deeper context that sits outside `/docs`:

| Document           | What it covers                                    | Canonical location                                                                                 |
| ------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Project overview   | High-level architecture, packages, and motivation | [`README.md`](https://github.com/theGeekist/wp-kernel/blob/main/README.md)                         |
| Development guide  | Environment setup, scripts, and tooling           | [`DEVELOPMENT.md`](https://github.com/theGeekist/wp-kernel/blob/main/DEVELOPMENT.md)               |
| Branching strategy | Release cadence and merge capability              | [`BRANCHING_STRATEGY.md`](https://github.com/theGeekist/wp-kernel/blob/main/BRANCHING_STRATEGY.md) |
| Change log         | Human-curated release notes                       | [`CHANGELOG.md`](https://github.com/theGeekist/wp-kernel/blob/main/CHANGELOG.md)                   |
| Licensing          | EUPL-1.2 terms and rationale                      | [`LICENSE`](https://github.com/theGeekist/wp-kernel/blob/main/LICENSE)                             |
| Package READMEs    | Package-specific instructions                     | [`packages/*/README.md`](https://github.com/theGeekist/wp-kernel/tree/main/packages)               |

Additional references:

- [`AGENTS.md`](https://github.com/theGeekist/wp-kernel/blob/main/AGENTS.md) - automation capability for bots and scripts.
- [`LICENSING.md`](https://github.com/theGeekist/wp-kernel/blob/main/LICENSING.md) - decision log for licensing choices.
- [`information/Roadmap`](https://github.com/theGeekist/wp-kernel/blob/main/information/Roadmap%20PO%20%E2%80%A2%20v1.0.md) - product roadmap.
- [`examples/showcase/README.md`](https://github.com/theGeekist/wp-kernel/blob/main/examples/showcase/README.md) - detailed walkthrough of the showcase plugin.
- [Framework Release Playbook](../releases/framework-release-playbook.md) - manual release checklist and verification steps.

## Standards and testing

Coding standards live in [Standards](/contributing/standards). Testing guidance is split between the [Testing](/contributing/testing) and [E2E testing](/contributing/e2e-testing) guides. Follow them whenever you touch a package or feature: we expect new work to ship with matching tests and documentation updates.

## Community expectations

We expect respectful, collaborative behaviour in issues, pull requests, and community spaces. Report unacceptable behaviour to the maintainers. Our goal is to keep the project welcoming while moving quickly.

When in doubt, reach out in the relevant issue or start a discussion. The team would rather clarify direction early than request large rewrites later.
