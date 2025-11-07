import {
	createWPKernelRuntime,
	createConfig,
	renderResourceDataView,
	flushDataViews,
} from '../test-support/ResourceDataView.test-support';
import type { RuntimeWithDataViews } from '../test-support/ResourceDataView.test-support';

describe('ResourceDataView permissions', () => {
	function renderWithCapability(runtime: RuntimeWithDataViews) {
		const config = createConfig({
			screen: {
				menu: {
					capability: 'jobs.view',
					slug: '',
					title: '',
				},
			},
		});

		renderResourceDataView({ runtime, config });
	}

	it('emits permission denied events when menu capability check fails', async () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = {
			capability: {
				can: jest.fn(() => false),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		renderWithCapability(runtime);
		await flushDataViews();

		expect(runtime.dataviews.events.permissionDenied).toHaveBeenCalledWith(
			expect.objectContaining({
				resource: 'jobs',
				capability: 'jobs.view',
				source: 'screen',
				reason: 'forbidden',
			})
		);
	});

	it('emits runtime-missing events when capability runtime is unavailable', async () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = undefined;

		renderWithCapability(runtime);
		await flushDataViews();

		expect(runtime.dataviews.events.permissionDenied).toHaveBeenCalledWith(
			expect.objectContaining({
				resource: 'jobs',
				capability: 'jobs.view',
				source: 'screen',
				reason: 'runtime-missing',
			})
		);
	});

	it('emits error events when capability check rejects', async () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = {
			capability: {
				can: jest.fn(() => Promise.reject(new Error('nope'))),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		renderWithCapability(runtime);
		await flushDataViews(2);

		expect(runtime.dataviews.events.permissionDenied).toHaveBeenCalledWith(
			expect.objectContaining({
				resource: 'jobs',
				capability: 'jobs.view',
				source: 'screen',
				reason: 'error',
			})
		);
	});
});
