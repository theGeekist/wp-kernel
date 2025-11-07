/**
 * Capability map contract used by the CLI when generating PHP permission helpers.
 *
 * Projects can define inline capability mappings in their resource configurations.
 * Each key represents a capability identifier referenced by resource routes and
 * maps to a capability descriptor. Values may either be:
 *
 * - a WordPress capability string (e.g. `'manage_options'`)
 * - a descriptor object describing the capability and how it should be applied
 *
 * All values must be JSON-serializable data (no functions).
 */
export type CapabilityMapScope = 'resource' | 'object';

/**
 * Descriptor for a capability entry used during PHP code generation.
 *
 * Used by the CLI when producing capability-checking helpers. A descriptor
 * refines how a capability should be evaluated (resource-level or object-level)
 * and optionally the request parameter to bind when performing object checks.
 *
 * @category CLI
 */
export interface CapabilityCapabilityDescriptor {
	capability: string;
	appliesTo?: CapabilityMapScope;
	/**
	 * Optional request parameter name used when `appliesTo === 'object'`.
	 * Defaults to the resource identity parameter when omitted.
	 */
	binding?: string;
}

/**
 * Represents a single entry in the capability map.
 *
 * Can be a simple string or a descriptor object.
 *
 * @category Capability
 */
export type CapabilityMapEntry = string | CapabilityCapabilityDescriptor;

/**
 * Defines the structure of a capability map.
 *
 * A record where keys are capability identifiers and values are `CapabilityMapEntry`.
 *
 * @category Capability
 */
export type CapabilityMapDefinition = Record<string, CapabilityMapEntry>;

/**
 * A helper function to define a capability map with type safety.
 *
 * @category Capability
 * @param    map - The capability map definition.
 * @returns The same capability map definition.
 */
export function defineCapabilityMap(
	map: CapabilityMapDefinition
): CapabilityMapDefinition {
	return map;
}
