import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useStableCallback, useLatest } from './internal/useStableCallback';

/**
 * Options for the useHoverPrefetch hook.
 *
 * @category Prefetching
 */
export interface HoverPrefetchOptions {
	/**
	 * The delay in milliseconds before the prefetch is triggered.
	 *
	 * @default 150
	 */
	delayMs?: number;
	/**
	 * If true, the prefetch will only be triggered once.
	 *
	 * @default true
	 */
	once?: boolean;
}

/**
 * Triggers a prefetch when the user hovers over an element.
 *
 * @category Prefetching
 * @param    ref     - A React ref to the element to monitor.
 * @param    fn      - The function to call to trigger the prefetch.
 * @param    options - Options for the hook.
 */
export function useHoverPrefetch(
	ref: RefObject<HTMLElement>,
	fn: () => void,
	options: HoverPrefetchOptions = {}
): void {
	const { delayMs = 150, once = true } = options;
	const fnRef = useStableCallback(fn);
	const onceRef = useLatest(once);
	const hasTriggeredRef = useRef(false);

	useEffect(() => {
		hasTriggeredRef.current = false;
	}, [once]);

	useEffect(() => {
		const element = ref.current;
		if (!element || typeof window === 'undefined') {
			return undefined;
		}

		let timeoutId: number | null = null;

		const cancel = () => {
			if (timeoutId !== null) {
				window.clearTimeout(timeoutId);
				timeoutId = null;
			}
		};

		const trigger = () => {
			if (onceRef.current && hasTriggeredRef.current) {
				return;
			}
			hasTriggeredRef.current = true;
			fnRef();
		};

		const handleEnter = () => {
			if (timeoutId !== null) {
				return;
			}
			if (onceRef.current && hasTriggeredRef.current) {
				return;
			}
			timeoutId = window.setTimeout(() => {
				timeoutId = null;
				trigger();
			}, delayMs);
		};

		const handleCancel = () => {
			cancel();
		};

		element.addEventListener('mouseenter', handleEnter);
		element.addEventListener('mouseleave', handleCancel);
		element.addEventListener('click', handleCancel);

		return () => {
			cancel();
			element.removeEventListener('mouseenter', handleEnter);
			element.removeEventListener('mouseleave', handleCancel);
			element.removeEventListener('click', handleCancel);
		};
	}, [delayMs, fnRef, onceRef, ref]);
}
