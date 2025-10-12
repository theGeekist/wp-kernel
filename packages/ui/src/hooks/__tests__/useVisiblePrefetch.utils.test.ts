import { __TESTING__ as visiblePrefetchUtils } from '../useVisiblePrefetch';

describe('useVisiblePrefetch helpers', () => {
	const { parseRootMargin, isVisibleWithinMargin } = visiblePrefetchUtils;

	it('parses CSS-like root margin strings', () => {
		expect(parseRootMargin('10px')).toEqual({
			top: 10,
			right: 10,
			bottom: 10,
			left: 10,
		});
		expect(parseRootMargin('5px 10px')).toEqual({
			top: 5,
			right: 10,
			bottom: 5,
			left: 10,
		});
		expect(parseRootMargin('1px 2px 3px 4px')).toEqual({
			top: 1,
			right: 2,
			bottom: 3,
			left: 4,
		});
		expect(parseRootMargin('garbage')).toEqual({
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		});
	});

	it('determines visibility within an expanded margin', () => {
		const visibleElement = {
			getBoundingClientRect: () => ({
				top: 10,
				left: 10,
				bottom: 30,
				right: 30,
			}),
		} as unknown as Element;
		const hiddenElement = {
			getBoundingClientRect: () => ({
				top: 2000,
				left: 10,
				bottom: 2030,
				right: 30,
			}),
		} as unknown as Element;

		expect(
			isVisibleWithinMargin(visibleElement, {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
			})
		).toBe(true);
		expect(
			isVisibleWithinMargin(hiddenElement, {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
			})
		).toBe(false);
	});

	it('falls back to document dimensions when window metrics are missing', () => {
		const element = {
			getBoundingClientRect: () => ({
				top: 0,
				left: 0,
				bottom: 10,
				right: 10,
			}),
		} as unknown as Element;

		const originalInnerHeight = window.innerHeight;
		const originalInnerWidth = window.innerWidth;
		Object.defineProperty(window, 'innerHeight', {
			value: 0,
			configurable: true,
		});
		Object.defineProperty(window, 'innerWidth', {
			value: 0,
			configurable: true,
		});
		const originalDocument = document.documentElement;
		Object.defineProperty(document, 'documentElement', {
			value: { clientHeight: 20, clientWidth: 20 },
			configurable: true,
		});

		expect(
			isVisibleWithinMargin(element, {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
			})
		).toBe(true);

		Object.defineProperty(window, 'innerHeight', {
			value: originalInnerHeight,
			configurable: true,
		});
		Object.defineProperty(window, 'innerWidth', {
			value: originalInnerWidth,
			configurable: true,
		});
		Object.defineProperty(document, 'documentElement', {
			value: originalDocument,
			configurable: true,
		});
	});
});
