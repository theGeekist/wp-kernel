import {
	isNumericIdentity,
	isStringIdentity,
	resolveIdentityConfig,
} from '@wpkernel/wp-json-ast';

describe('identity helper exports', () => {
	it('re-exports the core identity helpers', () => {
		expect(resolveIdentityConfig).toBe(resolveIdentityConfig);
		expect(isNumericIdentity).toBe(isNumericIdentity);
		expect(isStringIdentity).toBe(isStringIdentity);
	});
});
