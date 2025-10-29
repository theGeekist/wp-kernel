import { deriveModuleNamespace, moduleSegment } from '../namespace';

describe('deriveModuleNamespace', () => {
	it('returns namespace and sanitized namespace with custom segments', () => {
		const result = deriveModuleNamespace({
			pluginNamespace: 'Demo\\Plugin',
			sanitizedPluginNamespace: 'demo-plugin',
			segments: [moduleSegment('Generated', ''), moduleSegment('Rest')],
		});

		expect(result.namespace).toBe('Demo\\Plugin\\Generated\\Rest');
		expect(result.sanitizedNamespace).toBe('demo-plugin/rest');
	});

	it('normalises missing sanitized values using defaults', () => {
		const result = deriveModuleNamespace({
			pluginNamespace: 'Demo\\Plugin',
			segments: [moduleSegment('Capability')],
		});

		expect(result.namespace).toBe('Demo\\Plugin\\Capability');
		expect(result.sanitizedNamespace).toBe('demo-plugin/capability');
	});
});
