import type { ResourceObject } from '@wpkernel/core/resource';
import { WPKernelError } from '@wpkernel/core/error';
import { __TESTING__ as resourceHookUtils } from '../resource-hooks';

describe('resource hook utilities', () => {
	const {
		resolveWpGlobal,
		resolveWpGlobalFromSource,
		ensureUseSelect,
		computeItemLoading,
		computeListLoading,
		isItemResolving,
		isItemAwaitingResolution,
		isListResolving,
		shouldShowLoadingState,
	} = resourceHookUtils;

	const originalWp = (window as unknown as { wp?: unknown }).wp;

	beforeEach(() => {
		Object.assign(window as unknown as { wp?: unknown }, {
			wp: {
				data: {
					useSelect: jest.fn(),
				},
			},
		});
	});

	afterEach(() => {
		if (originalWp === undefined) {
			delete (window as unknown as { wp?: unknown }).wp;
		} else {
			Object.assign(window as unknown as { wp?: unknown }, {
				wp: originalWp,
			});
		}
	});

	it('resolves wp global when available', () => {
		expect(resolveWpGlobal()).toBeDefined();
	});

	it('returns undefined in non-browser contexts', () => {
		expect(resolveWpGlobalFromSource(undefined)).toBeUndefined();
	});

	it('returns data module when useSelect is present', () => {
		const resource = {
			name: 'jobs',
			storeKey: 'jobs',
			routes: {},
		} as ResourceObject<unknown, unknown>;
		const wpData = ensureUseSelect(resource, 'useGet');
		expect(typeof wpData.useSelect).toBe('function');
	});

	it('ensures useSelect throws descriptive error when missing', () => {
		const resource = {
			name: 'jobs',
			storeKey: 'jobs',
			routes: {},
		} as ResourceObject<unknown, unknown>;
		delete (window as unknown as { wp?: unknown }).wp;
		expect(() => ensureUseSelect(resource, 'useGet')).toThrow(
			WPKernelError
		);
	});

	it('computes item loading state via resolving helpers', () => {
		const selector = {
			isResolving: jest.fn(() => true),
			hasFinishedResolution: jest.fn(() => false),
		};
		expect(computeItemLoading(selector, 1)).toBe(true);
		selector.isResolving.mockReturnValue(false);
		expect(computeItemLoading(selector, 1)).toBe(true);
	});

	it('computes list loading status based on state machine', () => {
		const selector = {
			getListStatus: jest.fn(() => 'loading'),
			hasFinishedResolution: jest.fn(() => false),
			isResolving: jest.fn(() => false),
		};
		expect(computeListLoading(selector, { page: 1 })).toBe(true);

		selector.getListStatus.mockReturnValue('idle');
		expect(computeListLoading(selector, { page: 1 })).toBe(true);

		selector.getListStatus.mockReturnValue('success');
		expect(computeListLoading(selector, { page: 1 })).toBe(false);

		selector.getListStatus.mockReturnValue('pending');
		selector.isResolving.mockReturnValue(true);
		expect(computeListLoading(selector, { page: 1 })).toBe(true);
	});

	it('provides primitive resolvers for selectors', () => {
		const selector = {
			isResolving: jest.fn((method: string) => method === 'getList'),
			hasFinishedResolution: jest.fn(() => false),
		};
		expect(isListResolving(selector, {})).toBe(true);
		expect(isItemResolving(selector as never, 1)).toBe(false);
		expect(isItemAwaitingResolution(selector as never, 1)).toBe(true);
		expect(shouldShowLoadingState(selector as never, {}, 'idle')).toBe(
			true
		);
	});
});
