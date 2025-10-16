export interface IntersectionObserverController {
	trigger: (entry?: Partial<IntersectionObserverEntry>) => void;
	restore: () => void;
	mock: jest.MockedClass<typeof IntersectionObserver>;
}

export function createIntersectionObserverMock(): IntersectionObserverController {
	const originalObserver = window.IntersectionObserver;
	const observers = new Set<IntersectionObserverCallback>();

	const mock = jest.fn<IntersectionObserver, [IntersectionObserverCallback]>(
		(callback: IntersectionObserverCallback): IntersectionObserver => {
			observers.add(callback);
			return {
				observe: jest.fn(),
				unobserve: jest.fn(() => observers.delete(callback)),
				disconnect: jest.fn(() => observers.delete(callback)),
				takeRecords: jest.fn().mockReturnValue([]),
			} as unknown as IntersectionObserver;
		}
	) as unknown as jest.MockedClass<typeof IntersectionObserver>;

	window.IntersectionObserver =
		mock as unknown as typeof IntersectionObserver;

	return {
		trigger: (entry = {}) => {
			const payload: IntersectionObserverEntry = {
				isIntersecting: true,
				intersectionRatio: 1,
				boundingClientRect: DOMRectReadOnly.fromRect(),
				intersectionRect: DOMRectReadOnly.fromRect(),
				rootBounds: DOMRectReadOnly.fromRect(),
				target: document.createElement('div'),
				time: performance.now(),
				...entry,
			} as IntersectionObserverEntry;

			for (const callback of observers) {
				callback([payload], mock as unknown as IntersectionObserver);
			}
		},
		restore: () => {
			observers.clear();
			window.IntersectionObserver = originalObserver;
		},
		mock,
	};
}

export interface RequestAnimationFrameController {
	flush: () => void;
	restore: () => void;
	raf: jest.Mock;
	cancel: jest.Mock;
}

export function installRequestAnimationFrameMock(): RequestAnimationFrameController {
	const originalRaf = window.requestAnimationFrame;
	const originalCancel = window.cancelAnimationFrame;
	let queue: Array<{ id: number; cb: FrameRequestCallback }> = [];
	let id = 0;

	const raf = jest.fn((cb: FrameRequestCallback) => {
		const handle = ++id;
		queue.push({ id: handle, cb });
		return handle;
	});

	const cancel = jest.fn((handle: number) => {
		queue = queue.filter((item) => item.id !== handle);
	});

	window.requestAnimationFrame = raf;
	window.cancelAnimationFrame = cancel;

	return {
		flush: () => {
			const pending = [...queue];
			queue = [];
			for (const item of pending) {
				item.cb(performance.now());
			}
		},
		restore: () => {
			queue = [];
			window.requestAnimationFrame = originalRaf;
			window.cancelAnimationFrame = originalCancel;
		},
		raf,
		cancel,
	};
}
