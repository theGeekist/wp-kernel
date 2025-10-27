import { definePolicyMap } from '../policy-map';

describe('definePolicyMap', () => {
	it('returns provided map without modification', () => {
		const map = definePolicyMap({
			'demo.read': 'read',
			'demo.write': {
				capability: 'edit_demo',
				appliesTo: 'object',
				binding: 'id',
			},
		});

		expect(map).toEqual({
			'demo.read': 'read',
			'demo.write': {
				capability: 'edit_demo',
				appliesTo: 'object',
				binding: 'id',
			},
		});
	});
});
