/* istanbul ignore file -- macros module re-exports wp-json-ast factories */

export {
	buildArrayDimExpression,
	buildCachePrimingStatements,
	buildPropertyExpression,
	buildStatusValidationStatements,
	buildSyncMetaStatements,
	buildSyncTaxonomiesStatements,
	buildVariableExpression,
} from '@wpkernel/wp-json-ast';

export type {
	MacroExpression,
	MutationMetadataKeys,
} from '@wpkernel/wp-json-ast';
