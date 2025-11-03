import {
	buildIdentityGuardStatements,
	isNumericIdentity,
	isStringIdentity,
	resolveIdentityConfig,
} from '@wpkernel/wp-json-ast';
import * as identitySurface from '../identity';
import * as wpPostIdentity from '../resource/wpPost/identity';

describe('identity helper exports', () => {
	it('re-exports the core identity helpers', () => {
		expect(identitySurface.resolveIdentityConfig).toBe(
			resolveIdentityConfig
		);
		expect(identitySurface.isNumericIdentity).toBe(isNumericIdentity);
		expect(identitySurface.isStringIdentity).toBe(isStringIdentity);
	});

	it('exposes wp-post identity utilities', () => {
		expect(wpPostIdentity.buildIdentityValidationStatements).toBe(
			buildIdentityGuardStatements
		);
		expect(wpPostIdentity.isNumericIdentity).toBe(isNumericIdentity);
		expect(wpPostIdentity.isStringIdentity).toBe(isStringIdentity);
	});
});
