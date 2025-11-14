import type { WPKernelConfigV1 } from '@wpkernel/cli/config/types';

/**
 * WPKernel configuration for your project.
 *
 * This file describes your plugin namespace, shared schemas, REST resources,
 * capabilities, and readiness/adapter hooks. Update it to change what `wpk generate`
 * and `wpk apply` produce.
 *
 * @see https://wpkernel.dev/reference/wpk-config.schema.json
 */
/** @see https://github.com/wpkernel/wpkernel/blob/main/docs/internal/cli-migration-phases.md#authoring-safety-lint-rules */
export const wpkConfig: WPKernelConfigV1 = {
	/**
	 * Optional JSON Schema reference so editors can offer autocomplete
	 * and validation when editing this file.
	 */
	$schema: 'https://wpkernel.dev/reference/wpk-config.schema.json',
	/**
	 * Configuration schema version. Keep this set to `1` for the current
	 * WPKernel toolchain.
	 */
	version: 1,
	/**
	 * Short, slug-style identifier for this plugin or feature. Used as a prefix
	 * for PHP namespaces, generated JS store keys, and WordPress capability names.
	 *
	 * @example
	 * namespace: 'jobs',
	 */
	namespace: '__WPK_NAMESPACE__',
	/**
	 * Registry of shared schema descriptors, keyed by a short name. Schemas
	 * typically point to JSON Schema or Zod files and describe the data shapes
	 * your resources reuse.
	 */
	schemas: {},
	/**
	 * Registry of resource descriptors keyed by identifier. Each resource
	 * represents one domain object (job, booking, menu item, etc.) and drives
	 * REST routes, storage strategy, capabilities, and admin UI.
	 */
	resources: {},
	// adapters: {},
	// readiness: {},
};

export type WPKernelConfig = typeof wpkConfig;
