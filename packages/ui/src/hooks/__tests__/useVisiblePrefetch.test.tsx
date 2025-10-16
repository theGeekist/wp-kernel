/* @jsxImportSource react */
import { act, createRef, type RefObject } from 'react';
import { createRoot } from 'react-dom/client';
import { useVisiblePrefetch } from '../useVisiblePrefetch';
import type {
	IntersectionObserverController,
	RequestAnimationFrameController,
} from '../../../tests/dom-observer.test-support';
import {
	createIntersectionObserverMock,
	installRequestAnimationFrameMock,
} from '../../../tests/dom-observer.test-support';

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type VisiblePrefetchOptions = Parameters<typeof useVisiblePrefetch>[2];

type RenderTarget = (ref: RefObject<HTMLDivElement>) => JSX.Element;

interface RenderResult {
	element?: HTMLDivElement | null;
	callback: jest.Mock;
	trigger: (entry?: Partial<IntersectionObserverEntry>) => void;
	unmount: () => void;
	observer?: jest.Mocked<IntersectionObserver>;
	invokeObserver?: (entry?: Partial<IntersectionObserverEntry>) => void;
}

describe('useVisiblePrefetch', () => {
	let observerController: IntersectionObserverController | undefined;
	let rafController: RequestAnimationFrameController | undefined;

	beforeEach(() => {
		observerController = createIntersectionObserverMock();
	});

	afterEach(() => {
		observerController?.restore();
		observerController = undefined;
		rafController?.restore();
		rafController = undefined;
	});

	function renderVisiblePrefetchInstance(
		options?: VisiblePrefetchOptions,
		renderTarget: RenderTarget = (ref) => <div ref={ref}>Target</div>
	): RenderResult {
		const container = document.createElement('div');
		const root = createRoot(container);
		const callback = jest.fn();
		const ref = createRef<HTMLDivElement>();

		function TestComponent() {
			useVisiblePrefetch(ref, callback, options);
			return renderTarget(ref);
		}

		act(() => {
			root.render(<TestComponent />);
		});

		const observerResult = observerController?.mock.mock.results.at(-1);
		const observer = observerResult?.value as
			| jest.Mocked<IntersectionObserver>
			| undefined;
		const observerCallback = observerController?.mock.mock.calls.at(
			-1
		)?.[0] as IntersectionObserverCallback | undefined;

		return {
			element: ref.current,
			callback,
			trigger: (entry = {}) => {
				if (!observerController) {
					throw new Error('IntersectionObserver mock not installed');
				}
				if (!ref.current) {
					throw new Error('Ref not attached to an element');
				}
				observerController.trigger({
					target: ref.current,
					...entry,
				});
			},
			unmount: () => {
				act(() => {
					root.unmount();
				});
			},
			observer,
			invokeObserver: (entry = {}) => {
				if (!observerCallback) {
					throw new Error(
						'No IntersectionObserver callback registered'
					);
				}
				const target = ref.current ?? document.createElement('div');
				observerCallback(
					[
						{
							isIntersecting: true,
							target,
							intersectionRatio: 1,
							time: performance.now(),
							boundingClientRect: target.getBoundingClientRect(),
							intersectionRect: target.getBoundingClientRect(),
							rootBounds: null,
							...entry,
						} as IntersectionObserverEntry,
					],
					observer ?? ({} as IntersectionObserver)
				);
			},
		};
	}

	function disableIntersectionObserver() {
		const originalObserver = window.IntersectionObserver;
		observerController?.restore();
		observerController = undefined;
		Reflect.deleteProperty(window, 'IntersectionObserver');

		return () => {
			if (originalObserver) {
				window.IntersectionObserver = originalObserver;
			} else {
				Reflect.deleteProperty(window, 'IntersectionObserver');
			}
		};
	}

	it('invokes callback when IntersectionObserver reports visibility', () => {
		const { callback, trigger, unmount } = renderVisiblePrefetchInstance();

		act(() => {
			trigger();
		});

		expect(callback).toHaveBeenCalledTimes(1);

		unmount();
	});

	it('falls back to scroll listener when IntersectionObserver is unavailable', () => {
		const restoreObserver = disableIntersectionObserver();

		const raf = (rafController = installRequestAnimationFrameMock());

		const { callback, element, unmount } = renderVisiblePrefetchInstance({
			rootMargin: '100px',
			once: false,
		});

		expect(element).toBeTruthy();
		const target = element as HTMLDivElement;

		const rectSpy = jest.spyOn(target, 'getBoundingClientRect');
		raf.flush();
		callback.mockClear();
		rectSpy.mockReturnValue({
			top: 50,
			left: 0,
			bottom: 150,
			right: 100,
			width: 100,
			height: 100,
			x: 0,
			y: 50,
			toJSON: () => ({}),
		} as DOMRect);

		act(() => {
			window.dispatchEvent(new Event('scroll'));
		});
		raf.flush();

		expect(callback).toHaveBeenCalledTimes(1);
		callback.mockClear();

		rectSpy.mockReturnValue({
			top: 20,
			left: 0,
			bottom: 80,
			right: 100,
			width: 100,
			height: 60,
			x: 0,
			y: 20,
			toJSON: () => ({}),
		} as DOMRect);

		act(() => {
			window.dispatchEvent(new Event('resize'));
		});
		raf.flush();

		expect(callback).toHaveBeenCalledTimes(1);

		rectSpy.mockRestore();
		unmount();
		restoreObserver();
	});

	it('only triggers once by default even with repeated intersections', () => {
		const { callback, trigger, invokeObserver, observer, unmount } =
			renderVisiblePrefetchInstance();

		act(() => {
			trigger();
			invokeObserver?.();
		});

		expect(callback).toHaveBeenCalledTimes(1);
		expect(observer).toBeDefined();
		expect(observer!.disconnect).toHaveBeenCalled();

		unmount();
	});

	it('allows repeated triggers when once=false', () => {
		const { callback, trigger, observer, unmount } =
			renderVisiblePrefetchInstance({ once: false });

		act(() => {
			trigger();
			trigger();
		});

		expect(callback).toHaveBeenCalledTimes(2);
		expect(observer).toBeDefined();
		expect(observer!.disconnect).not.toHaveBeenCalled();

		unmount();
	});

	describe('rootMargin handling', () => {
		const cases: Array<
			[string, VisiblePrefetchOptions | undefined, string]
		> = [
			['default margin', undefined, '200px'],
			['empty string', { rootMargin: '' }, ''],
			['whitespace', { rootMargin: '   ' }, '   '],
			['single value', { rootMargin: '50px' }, '50px'],
			['two values', { rootMargin: '10px 20px' }, '10px 20px'],
			[
				'three values',
				{ rootMargin: '10px 20px 30px' },
				'10px 20px 30px',
			],
			[
				'four values',
				{ rootMargin: '10px 20px 30px 40px' },
				'10px 20px 30px 40px',
			],
			['arbitrary string', { rootMargin: 'invalid' }, 'invalid'],
		];

		it.each(cases)('applies %s', (_, options, expected) => {
			const { unmount } = renderVisiblePrefetchInstance(options);
			const lastCall = observerController?.mock.mock.calls.at(-1);

			expect(lastCall?.[1]?.rootMargin).toBe(expected);

			unmount();
		});
	});

	it('disconnects observers on unmount', () => {
		const { observer, unmount } = renderVisiblePrefetchInstance({
			once: false,
		});

		expect(observer).toBeDefined();

		unmount();

		expect(observer!.disconnect).toHaveBeenCalled();
	});

	it('handles SSR environment without window', () => {
		const descriptor = Object.getOwnPropertyDescriptor(
			globalThis,
			'window'
		);
		if (!descriptor?.configurable) {
			expect(descriptor?.configurable).toBe(false);
			return;
		}

		const originalWindow = globalThis.window;
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: undefined,
		});

		const container = document.createElement('div');
		const root = createRoot(container);
		const callback = jest.fn();
		const ref = createRef<HTMLDivElement>();

		function TestComponent() {
			useVisiblePrefetch(ref, callback);
			return <div ref={ref}>Target</div>;
		}

		expect(() => {
			act(() => {
				root.render(<TestComponent />);
			});
		}).not.toThrow();

		Object.defineProperty(globalThis, 'window', {
			...descriptor,
			value: originalWindow,
		});

		act(() => {
			root.unmount();
		});
	});

	it('handles null ref.current', () => {
		let instance: RenderResult | undefined;

		expect(() => {
			instance = renderVisiblePrefetchInstance(undefined, () => (
				<div>No ref assigned</div>
			));
		}).not.toThrow();

		instance?.unmount();
	});

	it('removes fallback listeners after triggering once', () => {
		const restoreObserver = disableIntersectionObserver();

		const raf = (rafController = installRequestAnimationFrameMock());
		const addListenerSpy = jest.spyOn(window, 'addEventListener');
		const removeListenerSpy = jest.spyOn(window, 'removeEventListener');

		const { callback, unmount } = renderVisiblePrefetchInstance({
			once: true,
		});

		expect(addListenerSpy).toHaveBeenCalledWith(
			'scroll',
			expect.any(Function),
			true
		);

		act(() => {
			window.dispatchEvent(new Event('scroll'));
		});
		raf.flush();

		expect(callback).toHaveBeenCalled();
		expect(removeListenerSpy).toHaveBeenCalledWith(
			'scroll',
			expect.any(Function),
			true
		);
		expect(removeListenerSpy).toHaveBeenCalledWith(
			'resize',
			expect.any(Function),
			true
		);

		addListenerSpy.mockRestore();
		removeListenerSpy.mockRestore();
		unmount();
		restoreObserver();
	});

	it('cancels pending animation frames during fallback cleanup', () => {
		const restoreObserver = disableIntersectionObserver();

		const raf = (rafController = installRequestAnimationFrameMock());
		const { unmount } = renderVisiblePrefetchInstance({ once: false });

		unmount();

		expect(raf.cancel).toHaveBeenCalled();

		restoreObserver();
	});

	it('ignores observer entries that are not intersecting', () => {
		const { callback, trigger, unmount } = renderVisiblePrefetchInstance();

		act(() => {
			trigger({ isIntersecting: false });
		});

		expect(callback).not.toHaveBeenCalled();

		unmount();
	});
});
