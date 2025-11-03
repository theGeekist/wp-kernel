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
	defineCapabilityMap,
	type CapabilityCapabilityDescriptor,
	type CapabilityMapDefinition,
	type CapabilityMapEntry,
	type CapabilityMapScope,
} from './capability-map';

export type {
	IRv1,
	IRSchema,
	IRResource,
	IRRoute,
	IRCapabilityHint,
	IRBlock,
	IRPhpProject,
	BuildIrOptions,
} from './ir/publicTypes';
export { buildIr } from './ir/buildIr';
export type {
	Helper,
	HelperApplyFn,
	HelperApplyOptions,
	HelperDescriptor,
	HelperKind,
	HelperMode,
	CreateHelperOptions,
} from '@wpkernel/core/pipeline';
export * from './runtime';
export * from './ir';
export * from './builders';
export * from './workspace';
export * from './commands';
