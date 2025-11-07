# @wpkernel/ui for Framework Contributors

## Overview

Framework contributors maintain the runtime that keeps plugin surfaces aligned with kernel resources. `@wpkernel/ui` composes capability checks, preference persistence, and event reporting so generated controllers act as thin proxies over shared behaviour.

## Workflow

Controllers resolve runtime services, normalise metadata, and emit registry events. During boot, `attachUIBindings()` discovers resources with DataView metadata and registers controllers plus saved views, so ensure new resource features map cleanly onto the metadata helpers before exposing them to plugins.

## Examples

```ts
export function createResourceDataViewController<TItem, TQuery>(
        options: ResourceDataViewControllerOptions<TItem, TQuery>
): ResourceDataViewController<TItem, TQuery> {
        const runtime = resolveRuntime(options.runtime);
        const resourceName = options.resource?.name ?? options.resourceName;

        if (!resourceName) {
                throw new DataViewsControllerError(
                        'Resource DataView controller requires a resource name.'
                );
        }

        const preferencesKey =
                options.preferencesKey ??
                defaultPreferencesKey(options.namespace, resourceName);

        const reporter = runtime.getResourceReporter(resourceName);
        const queryMapping = ensureQueryMapping(options, options.queryMapping);

        async function loadStoredView(): Promise<View | undefined> {
                try {
                        const stored = (await runtime.preferences.get(preferencesKey)) as
                                | View
                                | undefined;
                        if (stored && typeof stored === 'object') {
                                return mergeViews(options.config.defaultView, stored);
                        }
                        return undefined;
                } catch (error) {
                        reporter.error?.('Failed to load DataViews preferences', {
                                error,
                                preferencesKey,
                        });
                        return undefined;
                }
        }

        async function saveView(view: View): Promise<void> {
                try {
                        await runtime.preferences.set(preferencesKey, view);
                } catch (error) {
                        reporter.error?.('Failed to persist DataViews preferences', {
                                error,
                                preferencesKey,
                        });
                }
        }

        function mapViewToQuery(view: View): TQuery {
                const state = deriveViewState(view, options.config.defaultView);
                return queryMapping(state);
        }

        function emitViewChange(view: View): void {
                const state = deriveViewState(view, options.config.defaultView);
                runtime.events.viewChanged({
                        resource: resourceName,
                        viewState: state,
                });
        }
```

## Patterns

Keep persistence bounded to the runtime preferences API and rely on `deriveViewState()` when translating DataView rows into resource queries. Shared reporters should capture both failures and successful transitions so CLI-generated telemetry remains accurate.

## Extension Points

New metadata surfaces should extend `normalizeResourceDataViewMetadata()` rather than branching inside controller factories. This keeps saved view hydration, menu binding, and action normalisation consistent for both generated controllers and manual runtime registration.

## Testing

Augment `renderResourceDataView()` in `src/dataviews/test-support/ResourceDataView.test-support.tsx` when adding runtime features. The helper exposes factory hooks for actions, capability overrides, and simulated pagination so specs cover success, boundary, and failure paths without rewriting boilerplate.

## Cross-links

Coordinate with the pipeline framework contributor guide when adjusting controller registration phases, and keep the CLI framework guide in sync so generated manifests include any new metadata you expose here.
