import type { WPKInstance, WPKernelUIRuntime } from '@wpkernel/core/data';
import type { Reporter } from '@wpkernel/core/reporter';
import {
	__TESTING__ as runtimeTestUtils,
	createWPKernelDataViewsRuntime,
	normalizeDataViewsOptions,
} from '../runtime';
import { DataViewsConfigurationError } from '../errors';

describe('kernel dataviews runtime helpers', () => {
	const { isPlainObject, isPreferencesAdapter, childReporter } =
		runtimeTestUtils;

	function createReporter(overrides: Partial<Reporter> = {}): Reporter {
		const base: Reporter = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			child: jest.fn(() => ({
				debug: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				child: jest.fn(),
			})),
		} as unknown as Reporter;
		Object.assign(base, overrides);
		return base;
	}

	it('identifies plain objects and adapters', () => {
		expect(isPlainObject({})).toBe(true);
		expect(isPlainObject([])).toBe(false);
		expect(
			isPreferencesAdapter({ get: () => undefined, set: () => undefined })
		).toBe(true);
		expect(isPreferencesAdapter({})).toBe(false);
	});

	it('creates reporter children with graceful fallback', () => {
		const reporter = createReporter();
		const child = childReporter(reporter, 'ui.dataviews');
		expect(child).not.toBeUndefined();

		const failing = createReporter({
			child: jest.fn(() => {
				throw new Error('boom');
			}),
		});
		const fallback = childReporter(failing, 'ui.dataviews');
		expect(fallback).toBe(failing);
		expect(failing.warn).toHaveBeenCalledWith(
			'Failed to create reporter child',
			expect.objectContaining({ namespace: 'ui.dataviews' })
		);
	});

	it('normalizes options and validates adapters', () => {
		expect(normalizeDataViewsOptions(undefined)).toEqual({
			enable: true,
			autoRegisterResources: true,
		});

		expect(
			normalizeDataViewsOptions({
				enable: false,
				autoRegisterResources: false,
				preferences: { get: jest.fn(), set: jest.fn() },
			} as any)
		).toEqual({
			enable: false,
			autoRegisterResources: false,
			preferences: {
				get: expect.any(Function),
				set: expect.any(Function),
			},
		});

		expect(() =>
			normalizeDataViewsOptions({ preferences: {} } as any)
		).toThrow(DataViewsConfigurationError);
	});

	it('creates kernel runtime with default adapter when missing', () => {
		const kernel = { emit: jest.fn() } as unknown as WPKInstance;
		const reporter = createReporter();
		const runtime = { reporter } as unknown as WPKernelUIRuntime;
		const options = normalizeDataViewsOptions({ enable: true });

		const dataviewsRuntime = createWPKernelDataViewsRuntime(
			kernel,
			runtime,
			options
		);
		expect(dataviewsRuntime.registry.size).toBe(0);
		expect(typeof dataviewsRuntime.getResourceReporter).toBe('function');
	});
});
