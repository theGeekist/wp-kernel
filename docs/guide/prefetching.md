# Prefetching strategies

Prefetching is a hint, not a requirement. The UI should remain deterministic
whether or not a prefetch fires. These helpers exist to warm the cache ahead of
likely navigation, so when the user finally clicks the link the data is already
waiting in the store.

> ℹ️ Prefetching hooks read from the [`WPKernelUIRuntime`](/packages/ui/src/runtime/dataviews/runtime.ts). Attach UI bindings during
> [`configureWPKernel`](/api/@wpkernel/core/functions/configureWPKernel)({ ui: { attach: attachUIBindings } })` and wrap your React tree
with [`WPKernelUIProvider`](/api/@wpkernel/ui/functions/WPKernelUIProvider) so the runtime is available.

## When to prefetch

- **Detail hovers** - links in tables, context menus, or tooltips where the next
  click is almost guaranteed.
- **Scrolling lists** - preload the next page when the current page settles.
- **View transitions** - hero tiles that navigate to a filtered list can prime
  the first query while the user reads the summary.

Avoid prefetching in situations where the user is unlikely to visit the target.
Fetching too aggressively increases REST traffic and can work against WordPress
caching layers.

## Hooks overview

- [`usePrefetcher`](/api/@wpkernel/ui/functions/usePrefetcher) - stable wrappers around a resource's
  `prefetchGet` / `prefetchList`.
- [`useHoverPrefetch`](/api/@wpkernel/ui/functions/useHoverPrefetch) - wait for a hover to settle (default 150 ms) before firing.
- [`useVisiblePrefetch`](/api/@wpkernel/ui/functions/useVisiblePrefetch) - hook into `IntersectionObserver` or a scroll fallback.
- [`useNextPagePrefetch`](/api/@wpkernel/ui/functions/useNextPagePrefetch) - compute the next page query from the current list and
  run it after the list finishes loading.

All of the helpers delegate to the resource runtime (defined in your `wpk.config.ts` and further explained in the [Resources Guide](../guide/resources.md)), which means dedupe and store registration behave exactly like the imperative prefetch utilities.

## Example: prefetch job detail on hover

```tsx
import { useRef } from 'react';
import { usePrefetcher, useHoverPrefetch } from '@wpkernel/ui';
import { job } from '@/resources/job'; // your defined resource

export function JobRow({ jobId, title }: { jobId: number; title: string }) {
	const linkRef = useRef<HTMLAnchorElement>(null);
	const { prefetchGet } = usePrefetcher(job);

	useHoverPrefetch(linkRef, () => prefetchGet(jobId), { delayMs: 200 });

	return (
		<a ref={linkRef} href={`/admin/jobs/${jobId}`}>
			{title}
		</a>
	);
}
```

- The hover delay avoids unnecessary requests when the pointer flies across the
  screen.
- Clicking the link later uses the standard render hook (`job.useGet`), which now
  resolves immediately from the warmed cache.

## Example: infinite scroll backed by list prefetch

```tsx
import { usePrefetcher, useNextPagePrefetch } from '@wpkernel/ui';
import { job } from '@/resources/job';

export function JobsList({
	query,
}: {
	query: { page?: number; status?: string };
}) {
	const { data, status, error } = job.useList(query);

	useNextPagePrefetch(job, query, {
		when: status === 'success',
	});

	// render rows + pagination...
}
```

- `useNextPagePrefetch` defaults to `page + 1`. Provide `computeNext` when you
  use cursors instead of page numbers.
- Toggle the `when` option when you run into rate limits or when a filter makes
  the next page irrelevant.

## SSR and environments without `IntersectionObserver`

[`useVisiblePrefetch`](/api/@wpkernel/ui/functions/useVisiblePrefetch) checks for `IntersectionObserver` availability at runtime.
When it is missing (older browsers, SSR, tests), the hook falls back to a
capturing `scroll`/`resize` listener and throttles the check with
`requestAnimationFrame`. You do not need to detect this yourself-simply avoid
running prefetch hooks during SSR, just like any other browser-side effect.

## Pitfalls

- **Do not render from prefetch callbacks.** Prefetches warm the cache; they do
  not guarantee data availability. Continue to use render hooks (`resource.use*`)
  for actual rendering.
- **Clean up listeners.** The hooks take care of cleanup automatically. Avoid
  re-implementing them with custom listeners unless you have measurable
  performance needs.
- **Respect WordPress caching.** Prefetching should not spam the REST API. Pair
  prefetch triggers with heuristics that approximate user intent.

## Further reading

- API reference - [`usePrefetcher`](/api/@wpkernel/ui/functions/usePrefetcher)
- Resource runtime - [`packages/core/src/resource/define.ts`](../packages/core/src/resource/define.ts)
- Cache helpers - [`packages/core/src/resource/cache.ts`](../packages/core/src/resource/cache.ts)
