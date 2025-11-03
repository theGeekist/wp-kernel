import { fabricateWPKernelConfig } from '../integration/config-fabricators.js';

describe('fabricateWPKernelConfig', () => {
	it('builds config variants with optional components', () => {
		const fabrication = fabricateWPKernelConfig({
			namespace: 'custom-namespace',
			storage: 'wp-post',
			includeRemoteRoutes: true,
			includeCapabilities: true,
			includeSSRBlock: true,
			includeJsBlock: true,
		});

		expect(fabrication.config.namespace).toBe('custom-namespace');
		expect(fabrication.blocks.js).toBe(true);
		expect(fabrication.blocks.ssr).toBe(true);
		expect(Object.keys(fabrication.capabilities.resources ?? {})).toContain(
			'integration-item'
		);

		const resource = (fabrication.config as any).resources.item;
		expect(resource.storage.mode).toBe('wp-post');
		expect(resource.routes.create.path).toMatch(/^https:\/\//);
	});

	it('supports alternate storage modes', () => {
		const option = fabricateWPKernelConfig({ storage: 'wp-option' });
		const taxonomy = fabricateWPKernelConfig({ storage: 'wp-taxonomy' });
		const transient = fabricateWPKernelConfig({ storage: 'transient' });

		expect((option.config as any).resources.item.storage).toEqual({
			mode: 'wp-option',
			option: 'integration_item',
		});
		expect((taxonomy.config as any).resources.item.storage).toEqual({
			mode: 'wp-taxonomy',
			taxonomy: 'integration_item',
		});
		expect((transient.config as any).resources.item.storage).toEqual({
			mode: 'transient',
		});
	});
});
