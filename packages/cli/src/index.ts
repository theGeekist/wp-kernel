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
	KernelConfigV1,
	SchemaConfig,
	AdaptersConfig,
	PhpAdapterConfig,
	PhpAdapterFactory,
	AdapterContext,
	AdapterExtension,
	AdapterExtensionContext,
	AdapterExtensionFactory,
	ConfigOrigin,
	LoadedKernelConfig,
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
} from './ir';
export type { PrinterContext } from './printers/types';
export type { PhpAstBuilder } from './printers/php/types';

export {
	GenerateCommand,
	InitCommand,
	DoctorCommand,
	StartCommand,
	BuildCommand,
	ApplyCommand,
} from './commands';
