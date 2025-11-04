/**
 * Capability map contract used by the CLI when generating PHP permission helpers.
 *
 * Projects can author `src/capability-map.ts` files that export a plain object using
 * this shape. Each key represents a capability identifier referenced by resource
 * routes and maps to a capability descriptor. Values may either be:
 *
 * - a WordPress capability string (e.g. `'manage_options'`),
 * - a descriptor object describing the capability and how it should be applied,
 * - or a function that returns either of the above for additional authoring
 *   flexibility.
 *
 * The CLI evaluates function entries at build time, so they must be pure and
 * free of side effects. Returned descriptors should be JSON-serialisable.
 */
export type CapabilityMapScope = 'resource' | 'object';

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
 * A function that returns a capability string or descriptor.
 *
 * The CLI evaluates function entries at build time, so they must be pure and
 * free of side effects. Returned descriptors should be JSON-serialisable.
 *
 * @category Capability
 * @public
 */
export type CapabilityMapFunction = () =>
	| string
	| CapabilityCapabilityDescriptor;

/**
 * Represents a single entry in the capability map.
 *
 * Can be a simple string, a descriptor object, or a function returning either.
 *
 * @category Capability
 */
export type CapabilityMapEntry =
	| string
	| CapabilityCapabilityDescriptor
	| CapabilityMapFunction;

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
