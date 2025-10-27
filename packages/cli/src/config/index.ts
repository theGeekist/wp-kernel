/**
 * Kernel config types and utilities.
 */
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
} from './types';

export { loadWPKernelConfig } from './load-kernel-config';
export { validateWPKernelConfig } from './validate-kernel-config';
