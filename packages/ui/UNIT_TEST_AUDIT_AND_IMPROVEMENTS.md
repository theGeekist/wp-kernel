# UI Unit Test Audit

## Current baseline

- **Shared DataView harness.** `renderResourceDataView` and `flushDataViews` centralise runtime creation, rerendering, and async flushing so every spec consumes the same mocked kernel surface instead of wiring providers per file.【F:packages/ui/src/dataviews/test-support/ResourceDataView.test-support.tsx†L186-L253】
- **Action suites run through a shared scenario helper.** `renderActionScenario`, `buildListResource`, and `buildActionConfig` now live in the DataView test-support harness, keeping runtime wiring, invalidation paths, and policy gating centralised across specs.【F:packages/ui/src/dataviews/test-support/ResourceDataView.test-support.tsx†L110-L253】【F:packages/ui/src/dataviews/**tests**/ResourceDataView.actions.test.tsx†L23-L377】
- **Hooks exercise state matrices.** `useAction` relies on the kernel UI harness and a table-driven matrix to assert success, error, idle, and cancellation behaviour with consistent teardown between cases.【F:packages/ui/src/hooks/**tests**/useAction.test.tsx†L105-L218】
- **Docs point contributors to the helpers.** The README and package AGENT call out the UI harness, DOM observer helper, and DataView test support so new suites adopt the shared surface by default.【F:packages/ui/README.md†L143-L155】【F:packages/ui/AGENTS.md†L9-L14】

## Quality signals

- **Fetch/runtime integration lean on the harness.** The fetch and runtime specs render through `renderResourceDataView`, asserting reporter errors, pagination data, standalone runtime support, and DOM metadata without bespoke providers.【F:packages/ui/src/dataviews/**tests**/ResourceDataView.fetch.test.tsx†L1-L88】【F:packages/ui/src/dataviews/**tests**/ResourceDataView.runtime.test.tsx†L1-L160】
- **Policy and unmount behaviour remain covered.** The action suite asserts denied policies, pending resolutions, empty selections, unhandled errors, and unmount scenarios using the shared scenario builder, keeping side-effect expectations co-located with helper usage.【F:packages/ui/src/dataviews/**tests**/ResourceDataView.actions.test.tsx†L170-L377】
- **Kernel harness self-tests keep global state stable.** The UI harness exports registry resets and console guards, and the hook suites consume them to prevent cross-test leakage. The DataView harness self-test now exercises `renderActionScenario` so future suites can rely on its action mocks.【F:packages/ui/tests/ui-harness.test-support.ts†L47-L118】【F:packages/ui/src/hooks/**tests**/useAction.test.tsx†L116-L145】【F:packages/ui/src/dataviews/test-support/**tests**/ResourceDataView.test-support.test.tsx†L5-L68】

## Opportunities

- **Expand scenario coverage for mixed selection flows.** Future suites could use the shared scenario helpers to simulate per-item metadata or staged bulk selections so branch coverage stays high as new features land.【F:packages/ui/src/dataviews/test-support/ResourceDataView.test-support.tsx†L162-L253】
- **Expand fetch coverage beyond single-page cases.** Current fetch specs focus on direct resolve/reject flows with `useList` undefined; layering pagination or retry scenarios would exercise more branches if needed later.【F:packages/ui/src/dataviews/**tests**/ResourceDataView.fetch.test.tsx†L14-L88】
