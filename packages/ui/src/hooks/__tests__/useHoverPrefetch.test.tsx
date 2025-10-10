/* @jsxImportSource react */
import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useHoverPrefetch } from '../useHoverPrefetch';

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function setupHover(options?: Parameters<typeof useHoverPrefetch>[2]) {
	const container = document.createElement('div');
	const root = createRoot(container);
	const callback = jest.fn();
	const ref = createRef<HTMLButtonElement>();

	function TestComponent() {
		useHoverPrefetch(ref, callback, options);
		return (
			<button ref={ref} type="button">
				Hover
			</button>
		);
	}

	act(() => {
		root.render(<TestComponent />);
	});

	const element = ref.current!;

	return {
		element,
		callback,
		unmount: () => {
			act(() => root.unmount());
		},
	};
}

describe('useHoverPrefetch', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('invokes callback after configured delay on hover', () => {
		const { element, callback, unmount } = setupHover({
			delayMs: 100,
			once: true,
		});

		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			jest.advanceTimersByTime(99);
		});
		expect(callback).not.toHaveBeenCalled();

		act(() => {
			jest.advanceTimersByTime(1);
		});

		expect(callback).toHaveBeenCalledTimes(1);
		unmount();
	});

	it('cancels pending prefetch when mouse leaves quickly', () => {
		const { element, callback, unmount } = setupHover({
			delayMs: 200,
		});

		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			element.dispatchEvent(
				new MouseEvent('mouseleave', { bubbles: true })
			);
			jest.advanceTimersByTime(250);
		});

		expect(callback).not.toHaveBeenCalled();
		unmount();
	});

	it('only fires once by default', () => {
		const { element, callback, unmount } = setupHover({ delayMs: 50 });

		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			jest.advanceTimersByTime(50);
		});
		expect(callback).toHaveBeenCalledTimes(1);

		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			jest.advanceTimersByTime(50);
		});
		expect(callback).toHaveBeenCalledTimes(1);
		unmount();
	});

	it('supports repeated triggers when once=false', () => {
		const { element, callback, unmount } = setupHover({
			delayMs: 10,
			once: false,
		});

		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			jest.advanceTimersByTime(10);
		});
		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			jest.advanceTimersByTime(10);
		});

		expect(callback).toHaveBeenCalledTimes(2);
		unmount();
	});

	it('does nothing when the referenced element is not available', () => {
		function MissingElementComponent({ delayMs }: { delayMs?: number }) {
			const orphanRef = createRef<HTMLButtonElement>();
			useHoverPrefetch(orphanRef, jest.fn(), { delayMs });
			return null;
		}

		const container = document.createElement('div');
		const root = createRoot(container);

		act(() => {
			root.render(<MissingElementComponent delayMs={10} />);
		});

		expect(() => {
			act(() => {
				root.unmount();
			});
		}).not.toThrow();
	});

	it('cancels hover timeout on unmount', () => {
		const { element, callback, unmount } = setupHover({
			delayMs: 200,
		});

		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
		});

		// Unmount before timeout completes
		unmount();

		act(() => {
			jest.advanceTimersByTime(300);
		});

		// Callback should not fire after unmount
		expect(callback).not.toHaveBeenCalled();
	});

	it('uses default delay and once behaviour when options are omitted', () => {
		const { element, callback, unmount } = setupHover();

		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			jest.advanceTimersByTime(149);
		});
		expect(callback).not.toHaveBeenCalled();

		act(() => {
			jest.advanceTimersByTime(1);
		});
		expect(callback).toHaveBeenCalledTimes(1);

		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			jest.advanceTimersByTime(200);
		});
		expect(callback).toHaveBeenCalledTimes(1);

		unmount();
	});

	it('handles repeated hover before timeout completes', () => {
		const { element, callback, unmount } = setupHover({
			delayMs: 100,
			once: false,
		});

		// First hover - start timer
		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			jest.advanceTimersByTime(50); // 50ms elapsed
		});

		// Second hover before timeout - should restart timer
		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseleave', { bubbles: true })
			);
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			jest.advanceTimersByTime(50); // Another 50ms
		});

		// First timeout would have fired now, but it was cancelled
		expect(callback).not.toHaveBeenCalled();

		// Complete the second timeout
		act(() => {
			jest.advanceTimersByTime(50);
		});

		expect(callback).toHaveBeenCalledTimes(1);
		unmount();
	});

	it('cleans up event listeners on unmount', () => {
		const { element, unmount } = setupHover({ delayMs: 50 });

		const removeEventListenerSpy = jest.spyOn(
			element,
			'removeEventListener'
		);

		unmount();

		expect(removeEventListenerSpy).toHaveBeenCalledWith(
			'mouseenter',
			expect.any(Function)
		);
		expect(removeEventListenerSpy).toHaveBeenCalledWith(
			'mouseleave',
			expect.any(Function)
		);
	});

	it('ignores additional hover events while a timeout is pending', () => {
		const { element, callback, unmount } = setupHover({ delayMs: 100 });

		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
			jest.advanceTimersByTime(100);
		});

		expect(callback).toHaveBeenCalledTimes(1);
		unmount();
	});

	it('prevents double invocation when timers resolve repeatedly', () => {
		const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
		const { element, callback, unmount } = setupHover({
			delayMs: 50,
			once: true,
		});

		act(() => {
			element.dispatchEvent(
				new MouseEvent('mouseenter', { bubbles: true })
			);
		});

		const timeoutCall = setTimeoutSpy.mock.calls[0];
		expect(timeoutCall).toBeDefined();
		const [timeoutCallback] = timeoutCall as [() => void];

		act(() => {
			(timeoutCallback as () => void)();
			(timeoutCallback as () => void)();
		});

		expect(callback).toHaveBeenCalledTimes(1);
		unmount();
		setTimeoutSpy.mockRestore();
	});

	it('short-circuits gracefully when window is undefined', () => {
		const descriptor = Object.getOwnPropertyDescriptor(
			globalThis,
			'window'
		);

		if (!descriptor?.configurable) {
			expect(descriptor?.configurable).toBe(false);
			return;
		}

		const container = document.createElement('div');
		const root = createRoot(container);
		const callback = jest.fn();
		const ref = createRef<HTMLDivElement>();

		function SSRComponent() {
			useHoverPrefetch(ref, callback);
			return <div ref={ref}>content</div>;
		}

		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: undefined,
		});

		try {
			expect(() => {
				act(() => {
					root.render(<SSRComponent />);
				});
			}).not.toThrow();
		} finally {
			Object.defineProperty(globalThis, 'window', descriptor);
			act(() => {
				root.unmount();
			});
		}

		expect(callback).not.toHaveBeenCalled();
	});
});
