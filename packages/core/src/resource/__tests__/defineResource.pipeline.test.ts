import { defineResource } from '../define';
import * as pipelineModule from '../../pipeline/resources/createResourcePipeline';

describe('defineResource pipeline integration', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('uses the resource pipeline for resource definitions', () => {
		const pipelineSpy = jest.spyOn(
			pipelineModule,
			'createResourcePipeline'
		);

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
});
