# MVP Phase 0 - Alignment Checklist

Date: 2024‑XX‑XX  
Owner: Codex agent

## 1. Specification vs. Current Implementation

| Spec reference                               | Implementation status                                                                                              | Notes / action                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `mvp-cli-spec.md` §1–2 (Loader + validation) | ✓ `src/config/load-kernel-config.ts` and `src/config/validate-kernel-config.ts` already mirror the spec.           | Behaviour confirmed via existing Jest suites (`packages/cli/src/config/__tests__`). No gaps found. |
| §3–4 (IR structure)                          | ✓ `src/ir/build-ir.ts` constructs schemas/resources and hashes, but lacks future metadata (`transport`, `blocks`). | TODO carried forward to Phase 1A/1B.                                                               |
| §4.3 (PHP printer deltas)                    | ⚠️ Current printer only emits basic REST controllers (no CRUD bodies).                                             | Addressed in Phases 2A–2C.                                                                         |
| §4.4 (Block printers)                        | ✗ Not implemented.                                                                                                 | Phases 3A–3B cover the missing functionality.                                                      |
| §5 (Policy integration)                      | ✗ Not implemented.                                                                                                 | Phase 7 will add policy map support.                                                               |
| §6 (Lint rules)                              | ⚠️ Core ESLint config present (`eslint.config.js`) with `@kernel` plugin; new rules absent.                        | Phase 4 will extend the plugin.                                                                    |
| §7–8 (Commands)                              | ✓ `wpk generate`/`apply`/`start` exist; `init` is stubbed.                                                         | Phase 5A upgrades `init`; 5B integrates new printers.                                              |
| §9–10 (Testing/adoption)                     | ✓ Jest + docs infrastructure exist.                                                                                | No additional action beyond future phases.                                                         |

## 2. KernelConfig Usage Trace

- Loader → `config/load-kernel-config.ts`
- Validation → `config/validate-kernel-config.ts`
- IR → `ir/build-ir.ts`
- Printers → `printers/index.ts`, `printers/php/printer.ts`, `printers/types/printer.ts`, `printers/ui/printer.ts`
- Commands → `commands/run-generate.ts`, `commands/apply.ts`, `commands/start.ts`, `commands/init.ts`

Touchpoints align with the spec; future phases hook into the same modules.

## 3. TODO Summary (carried into Phases)

1. Enhance IR with route transport metadata and block entries (Phases 1A–1B).
2. Expand PHP printer for CRUD outputs per storage mode (Phases 2A–2C).
3. Add block printers (Phases 3A–3B) and ensure apply handles them (Phase 6).
4. Extend ESLint plugin with config-aware rules (Phase 4).
5. Replace `init` stub and refresh docs/pipeline integration (Phases 5A–5B).
6. Implement policy map integration (Phase 7).
7. Final QA/release preparation (Phase 8).

## 4. Smoke Test Verification

Sample project: `examples/test-the-cli`

Commands executed:

```bash
pnpm --filter @wpkernel/core build
pnpm --filter @wpkernel/cli build

cd examples/test-the-cli
node ../../packages/cli/bin/wpk.js --help
node ../../packages/cli/bin/wpk.js generate --dry-run
node ../../packages/cli/bin/wpk.js generate
```

Result: CLI runs successfully against the minimal config; no path/cwd issues observed.

---

All Phase 0 tasks completed; follow-up work tracked in subsequent phases listed in `packages/cli/MVP-PHASES.md`.
