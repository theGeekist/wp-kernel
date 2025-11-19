import { resolveIdentityConfig } from '@wpkernel/wp-json-ast';
import type { IRResource } from '../../../ir/publicTypes';
import { makeResource } from '@wpkernel/test-utils/builders/php/fixtures.test-support';

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
	return makeResource({
		name: 'books',
		schemaKey: 'book',
		routes: [],
		...overrides,
	});
}
