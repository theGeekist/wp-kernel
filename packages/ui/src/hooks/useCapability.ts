import {
	useCallback,
	useEffect,
	useState,
	useSyncExternalStore,
} from '@wordpress/element';
import { WPKernelError } from '@wpkernel/core/error';
import { createCapabilityCacheKey } from '@wpkernel/core/capability';
import type {
	ParamsOf,
	CapabilityHelpers,
	UseCapabilityResult,
} from '@wpkernel/core/capability';
import { useWPKernelUI } from '../runtime/context';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';

type CapabilityLike<K extends Record<string, unknown>> =
	| CapabilityHelpers<K>
	| (Partial<CapabilityHelpers<K>> & {
			cache?: CapabilityHelpers<K>['cache'];
	  });

function isPromise(value: unknown): value is Promise<unknown> {
	return typeof value === 'object' && value !== null && 'then' in value;
}

function resolveCapability<K extends Record<string, unknown>>(
	runtime: WPKernelUIRuntime
): CapabilityLike<K> | undefined {
	return runtime.capabilities?.capability as CapabilityLike<K> | undefined;
}

/**
 * React hook that exposes the wpk capability runtime to UI components.
 *
 * Components can gate controls with `can()` while reacting to the shared
 * capability cache for loading and error states. The hook mirrors the capability
 * enforcement path used during action execution, keeping UI affordances in
 * sync with capability checks. When no capability runtime is present we surface a
 * developer error so plugin authors remember to bootstrap via `defineCapability()`.
 *
 * @category Utilities
 * @public
 */
export function useCapability<
	K extends Record<string, unknown>,
>(): UseCapabilityResult<K> {
	const runtime = useWPKernelUI();
	const capability = resolveCapability<K>(runtime);
	const cache = capability?.cache;

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
		if (capability?.can) {
			setError(undefined);
		} else {
			setError(
				new WPKernelError('DeveloperError', {
					message:
						'No capability runtime configured. Call defineCapability() and wire it into the action runtime.',
				})
			);
		}
		setHydrated(true);
	}, [capability]);

	const can = useCallback(
		<Key extends keyof K>(
			key: Key,
			...params: ParamsOf<K, Key>
		): boolean => {
			if (!hydrated || !capability?.can) {
				return false;
			}

			const param = params[0] as ParamsOf<K, Key>[0] | undefined;
			const cacheKey = createCapabilityCacheKey(String(key), param);
			const cached = cache?.get(cacheKey);
			if (typeof cached === 'boolean') {
				return cached;
			}

			try {
				const result = capability.can(
					key,
					...(params as ParamsOf<K, Key>)
				);
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
		[hydrated, capability, cache]
	);

	const keys = capability?.keys ? capability.keys() : [];

	return {
		can,
		keys,
		isLoading: !hydrated,
		error,
	};
}
