import type { IRResource } from '../../../../ir/types';
import { resolveIdentityConfig } from '../identity';

describe('resolveIdentityConfig', () => {
	it('defaults to numeric id when identity is missing', () => {
		const resource = buildResource();

		expect(resolveIdentityConfig(resource)).toEqual({
			type: 'number',
			param: 'id',
		});
	});

	it('defaults to slug parameter for string identities without explicit param', () => {
		const resource = buildResource({
			identity: { type: 'string' },
		});

		expect(resolveIdentityConfig(resource)).toEqual({
			type: 'string',
			param: 'slug',
		});
	});

	it('preserves explicit identity parameters', () => {
		const resource = buildResource({
			identity: { type: 'string', param: 'uuid' },
		});

		expect(resolveIdentityConfig(resource)).toEqual({
			type: 'string',
			param: 'uuid',
		});
	});
});

function buildResource(overrides: Partial<IRResource> = {}): IRResource {
	return {
		name: 'books',
		schemaKey: 'book',
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: {
			list: { segments: [], source: 'default' },
			get: { segments: [], source: 'default' },
		},
		hash: 'hash',
		warnings: [],
		...overrides,
	};
}
