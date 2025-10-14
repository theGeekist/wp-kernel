# `useAction`

React hook that wraps kernel actions with predictable state, concurrency
policies, and cache invalidation helpers. It dispatches Actions through the
kernel middleware (`packages/core/src/actions/middleware.ts`), so you keep all
the lifecycle instrumentation provided by `defineAction`
(`packages/core/src/actions/define.ts`) while gaining a first-class React
interface.

The hook lives in `@wpkernel/ui` and expects a `KernelUIRuntime` to be
available via `KernelUIProvider`. Attach the runtime during
`configureKernel({ ui: { attach: attachUIBindings } })` and wrap your React tree
with `KernelUIProvider` so hooks can resolve the registry and action dispatcher.
`useAction()` does **not** reimplement actions-everything still flows through
`invokeAction` and the runtime declared in
`packages/core/src/actions/types.ts`.

## Signature

```ts
import type { DefinedAction } from '@wpkernel/core/actions';
import type { CacheKeyPattern } from '@wpkernel/core';
import { useAction } from '@wpkernel/ui';

function useAction<TInput, TResult>(
	action: DefinedAction<TInput, TResult>,
	options?: {
		concurrency?: 'parallel' | 'switch' | 'queue' | 'drop';
		dedupeKey?: (input: TInput) => string;
		autoInvalidate?: (
			result: TResult,
			input: TInput
		) => CacheKeyPattern[] | false;
	}
): {
	run(input: TInput): Promise<TResult>;
	cancel(): void;
	reset(): void;
	status: 'idle' | 'running' | 'success' | 'error';
	result?: TResult;
	error?: KernelError;
	inFlight: number;
};
```

### Options

| Option           | Description                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `concurrency`    | How to treat overlapping calls. Defaults to `parallel`.                                                                       |
| `dedupeKey`      | Return a string key to share a single in-flight promise (useful for search boxes).                                            |
| `autoInvalidate` | Return cache key patterns to invalidate after a successful run. Uses `invalidate` from `packages/core/src/resource/cache.ts`. |

### Concurrency modes

- **`parallel`** – every call runs immediately. `inFlight` tracks the count.
- **`switch`** – cancel local tracking for previous calls and focus on the latest.
- **`queue`** – run calls serially in FIFO order.
- **`drop`** – ignore new calls while an invocation is active (return the
  current promise).

## Example: basic form submission

```tsx
import { useAction } from '@wpkernel/ui';
import { CreateJob } from '@/actions/job/CreateJob';

export function JobForm() {
	const { run, status, error } = useAction(CreateJob, {
		autoInvalidate: () => [['job', 'list']],
	});

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		try {
			await run({ title: form.get('title') as string });
		} catch {
			// error already captured in hook state
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			{/* ...fields... */}
			<button type="submit" disabled={status === 'running'}>
				{status === 'running' ? 'Saving…' : 'Save'}
			</button>
			{status === 'error' && (
				<Notice status="error">{error?.message}</Notice>
			)}
		</form>
	);
}
```

## Example: search typeahead with dedupe

```tsx
const SearchSuggestions = defineAction<string, Suggestion[]>(
	'search.suggest',
	async (_ctx, query) => {
		return fetchSuggestions(query.trim());
	}
);

export function SearchBox() {
	const { run, cancel, status, result } = useAction(SearchSuggestions, {
		concurrency: 'switch',
		dedupeKey: (q) => q.trim(),
	});

	const [query, setQuery] = useState('');

	useEffect(() => {
		if (!query) {
			cancel();
			return;
		}
		const timer = setTimeout(() => {
			run(query).catch(() => {});
		}, 150);
		return () => clearTimeout(timer);
	}, [query, run, cancel]);

	return (
		<div>
			<input
				value={query}
				onChange={(event) => setQuery(event.target.value)}
			/>
			{status === 'running' && <Spinner />}
			<ul>
				{result?.map((item) => (
					<li key={item.id}>{item.label}</li>
				))}
			</ul>
		</div>
	);
}
```

## Behaviour

- Always dispatches through `invokeAction`, so middleware, lifecycle hooks, and
  reporter instrumentation still fire.
- Wraps every error in `KernelError`. If the Action runtime throws something
  else, the hook normalises it to `KernelError('UnknownError')`.
- `cancel()` only affects local state. The underlying Action continues to run,
  matching the current kernel capabilities (no AbortSignal support yet).
- `reset()` clears `result` and `error` without cancelling active requests.
- Dedupe uses the provided key and shares the same promise across hook calls,
  which means `.run()` returns the same promise for identical inputs.

## SSR

The module can be imported in server contexts. Calling `run()` requires
`window.wp.data` **and** an attached UI runtime (the hook throws a
`KernelError('DeveloperError')` otherwise). This mirrors the behaviour of the
kernel runtime and prevents hooks from running before the browser environment is
available.

## References

- Action definition – [`packages/core/src/actions/define.ts`](../packages/core/src/actions/define.ts)
- Middleware/dispatch – [`packages/core/src/actions/middleware.ts`](../packages/core/src/actions/middleware.ts)
- Action context types – [`packages/core/src/actions/types.ts`](../packages/core/src/actions/types.ts)
- Cache helpers used by `autoInvalidate` – [`packages/core/src/resource/cache.ts`](../packages/core/src/resource/cache.ts)
