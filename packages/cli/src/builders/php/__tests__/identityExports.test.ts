import {
	isNumericIdentity,
	isStringIdentity,
	resolveIdentityConfig,
} from '@wpkernel/wp-json-ast';
import * as identitySurface from '../identity';

describe('identity helper exports', () => {
	it('re-exports the core identity helpers', () => {
		expect(identitySurface.resolveIdentityConfig).toBe(
			resolveIdentityConfig
		);
		expect(identitySurface.isNumericIdentity).toBe(isNumericIdentity);
		expect(identitySurface.isStringIdentity).toBe(isStringIdentity);
	});
});
