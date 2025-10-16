import { __TESTING__ as visiblePrefetchUtils } from '../useVisiblePrefetch';

describe('useVisiblePrefetch helpers', () => {
	const { parseRootMargin, isVisibleWithinMargin } = visiblePrefetchUtils;

	describe('parseRootMargin', () => {
		const cases: Array<
			[
				string,
				string,
				{ top: number; right: number; bottom: number; left: number },
			]
		> = [
			[
				'single value',
				'10px',
				{ top: 10, right: 10, bottom: 10, left: 10 },
			],
			[
				'two values',
				'5px 10px',
				{ top: 5, right: 10, bottom: 5, left: 10 },
			],
			[
				'four values',
				'1px 2px 3px 4px',
				{ top: 1, right: 2, bottom: 3, left: 4 },
			],
			[
				'invalid tokens',
				'garbage',
				{ top: 0, right: 0, bottom: 0, left: 0 },
			],
		];

		it.each(cases)('parses %s', (_, input, expected) => {
			expect(parseRootMargin(input)).toEqual(expected);
		});
	});

	describe('isVisibleWithinMargin', () => {
		const margin = { top: 0, right: 0, bottom: 0, left: 0 };

		it('returns true when the element is inside the viewport', () => {
			const element = {
				getBoundingClientRect: () => ({
					top: 10,
					left: 10,
					bottom: 30,
					right: 30,
				}),
			} as unknown as Element;

			expect(isVisibleWithinMargin(element, margin)).toBe(true);
		});

		it('returns false when the element is outside the viewport', () => {
			const element = {
				getBoundingClientRect: () => ({
					top: 2000,
					left: 10,
					bottom: 2030,
					right: 30,
				}),
			} as unknown as Element;

			expect(isVisibleWithinMargin(element, margin)).toBe(false);
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

			expect(isVisibleWithinMargin(element, margin)).toBe(true);

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
});
