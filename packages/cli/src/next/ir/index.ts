export {
	createIr,
	registerCoreFragments,
	registerCoreBuilders,
} from './createIr';
export { createMetaFragment, META_EXTENSION_KEY } from './fragments/meta';
export {
	createSchemasFragment,
	SCHEMA_EXTENSION_KEY,
} from './fragments/schemas';
export { createResourcesFragment } from './fragments/resources';
export { createPoliciesFragment } from './fragments/policies';
export { createPolicyMapFragment } from './fragments/policy-map';
export { createDiagnosticsFragment } from './fragments/diagnostics';
export { createBlocksFragment } from './fragments/blocks';
export { createOrderingFragment } from './fragments/ordering';
export { createValidationFragment } from './fragments/validation';
export type {
	IRDiagnostic,
	IRDiagnosticSeverity,
	MutableIr,
	IrFragment,
	IrFragmentInput,
	IrFragmentOutput,
} from './types';
