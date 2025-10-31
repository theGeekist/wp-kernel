/* istanbul ignore file -- this module re-exports wp-json-ast identity helpers */

export {
	buildIdentityGuardStatements as buildIdentityValidationStatements,
	isNumericIdentity,
	isStringIdentity,
	type IdentityGuardOptions as IdentityValidationOptions,
} from '@wpkernel/wp-json-ast';
