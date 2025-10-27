import {
	useCallback,
	useEffect,
	useState,
	useSyncExternalStore,
} from '@wordpress/element';
import { WPKernelError } from '@wpkernel/core/error';
import { createPolicyCacheKey } from '@wpkernel/core/policy';
import type {
	ParamsOf,
	PolicyHelpers,
	UsePolicyResult,
} from '@wpkernel/core/policy';
import { useWPKernelUI } from '../runtime/context';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';

type PolicyLike<K extends Record<string, unknown>> =
	| PolicyHelpers<K>
	| (Partial<PolicyHelpers<K>> & { cache?: PolicyHelpers<K>['cache'] });

function isPromise(value: unknown): value is Promise<unknown> {
	return typeof value === 'object' && value !== null && 'then' in value;
}

function resolvePolicy<K extends Record<string, unknown>>(
	runtime: WPKernelUIRuntime
): PolicyLike<K> | undefined {
	return runtime.policies?.policy as PolicyLike<K> | undefined;
}

/**
 * React hook that exposes the kernel policy runtime to UI components.
 *
 * Components can gate controls with `can()` while reacting to the shared
 * policy cache for loading and error states. The hook mirrors the policy
 * enforcement path used during action execution, keeping UI affordances in
 * sync with capability checks. When no policy runtime is present we surface a
 * developer error so plugin authors remember to bootstrap via `definePolicy()`.
 */
export function usePolicy<
	K extends Record<string, unknown>,
>(): UsePolicyResult<K> {
	const runtime = useWPKernelUI();
	const policy = resolvePolicy<K>(runtime);
	const cache = policy?.cache;

	const subscribe = useCallback(
		(listener: () => void) =>
			cache?.subscribe(listener) ?? (() => undefined),
		[cache]
	);
	const getSnapshot = useCallback(() => cache?.getSnapshot() ?? 0, [cache]);
	useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	const [hydrated, setHydrated] = useState(false);
	const [error, setError] = useState<Error | undefined>(undefined);

	useEffect(() => {
		if (policy?.can) {
			setError(undefined);
		} else {
			setError(
				new WPKernelError('DeveloperError', {
					message:
						'No policy runtime configured. Call definePolicy() and wire it into the action runtime.',
				})
			);
		}
		setHydrated(true);
	}, [policy]);

	const can = useCallback(
		<Key extends keyof K>(
			key: Key,
			...params: ParamsOf<K, Key>
		): boolean => {
			if (!hydrated || !policy?.can) {
				return false;
			}

			const param = params[0] as ParamsOf<K, Key>[0] | undefined;
			const cacheKey = createPolicyCacheKey(String(key), param);
			const cached = cache?.get(cacheKey);
			if (typeof cached === 'boolean') {
				return cached;
			}

			try {
				const result = policy.can(key, ...(params as ParamsOf<K, Key>));
				if (isPromise(result)) {
					result.catch((err) => {
						if (err instanceof Error) {
							setError(err);
						} else {
							setError(new Error(String(err)));
						}
					});
					return false;
				}
				return result;
			} catch (err) {
				if (err instanceof Error) {
					setError(err);
				} else {
					setError(new Error(String(err)));
				}
				return false;
			}
		},
		[hydrated, policy, cache]
	);

	const keys = policy?.keys ? policy.keys() : [];

	return {
		can,
		keys,
		isLoading: !hydrated,
		error,
	};
}
