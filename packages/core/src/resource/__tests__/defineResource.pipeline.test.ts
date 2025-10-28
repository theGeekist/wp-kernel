import { defineResource } from '../define';
import {
	resetCorePipelineConfig,
	setCorePipelineConfig,
} from '../../configuration/flags';
import * as pipelineModule from '../../pipeline/resources/createResourcePipeline';

describe('defineResource pipeline integration', () => {
	afterEach(() => {
		resetCorePipelineConfig();
		jest.restoreAllMocks();
	});

	it('uses the resource pipeline when the flag is enabled', () => {
		const pipelineSpy = jest.spyOn(
			pipelineModule,
			'createResourcePipeline'
		);
		setCorePipelineConfig({ enabled: true });

		const resource = defineResource<{ id: number }>({
			name: 'pipeline-test',
			routes: {
				list: { path: '/test/v1/items', method: 'GET' },
			},
		});

		expect(pipelineSpy).toHaveBeenCalledTimes(1);
		expect(resource.storeKey.endsWith('/pipeline-test')).toBe(true);
		expect(typeof resource.prefetchList).toBe('function');
	});

	it('falls back to the legacy path when the flag is disabled', () => {
		const pipelineSpy = jest.spyOn(
			pipelineModule,
			'createResourcePipeline'
		);
		setCorePipelineConfig({ enabled: false });

		const resource = defineResource<{ id: number }>({
			name: 'legacy-test',
			routes: {
				list: { path: '/legacy/v1/items', method: 'GET' },
			},
		});

		expect(pipelineSpy).not.toHaveBeenCalled();
		expect(resource.storeKey.endsWith('/legacy-test')).toBe(true);
	});
});
