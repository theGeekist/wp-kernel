/**
 * Top-level exports for the `@wpkernel/cli` package.
 *
 * This module re-exports the public surface of the CLI package so
 * documentation generators can build consistent API pages alongside the
 * kernel and UI packages.
 *
 * @module @wpkernel/cli
 */
export { VERSION } from './version';
export { runCli } from './cli/run';

export type {
	WPKernelConfigV1,
	SchemaConfig,
	AdaptersConfig,
	PhpAdapterConfig,
	PhpAdapterFactory,
	AdapterContext,
	AdapterExtension,
	AdapterExtensionContext,
	AdapterExtensionFactory,
	ConfigOrigin,
	LoadedWPKernelConfig,
} from './config';

export {
	definePolicyMap,
	type PolicyCapabilityDescriptor,
	type PolicyMapDefinition,
	type PolicyMapEntry,
	type PolicyMapScope,
} from './policy-map';

export type {
	IRv1,
	IRSchema,
	IRResource,
	IRRoute,
	IRPolicyHint,
	IRBlock,
	IRPhpProject,
	BuildIrOptions,
} from './next/ir/publicTypes';
export { buildIr } from './next/ir/buildIr';
export * as next from './next';
