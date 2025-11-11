import { resourceAccessors } from '../storage.accessors';

describe('resource accessors registry', () => {
	it('exposes registered storage descriptors', () => {
		const wpPost = resourceAccessors.storagesByKind.get('wpPost');
		const wpOption = resourceAccessors.storagesByKind.get('wpOption');

		expect(wpPost).toBeDefined();
		expect(wpPost?.helpers).not.toHaveLength(0);
		expect(wpPost?.queries).not.toHaveLength(0);

		expect(wpOption).toBeDefined();
		expect(wpOption?.mutations).not.toHaveLength(0);
	});
});
