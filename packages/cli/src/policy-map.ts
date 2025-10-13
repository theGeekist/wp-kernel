/**
 * Policy map contract used by the CLI when generating PHP permission helpers.
 *
 * Projects can author `src/policy-map.ts` files that export a plain object using
 * this shape. Each key represents a policy identifier referenced by resource
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
export type PolicyMapScope = 'resource' | 'object';

export interface PolicyCapabilityDescriptor {
	capability: string;
	appliesTo?: PolicyMapScope;
	/**
	 * Optional request parameter name used when `appliesTo === 'object'`.
	 * Defaults to the resource identity parameter when omitted.
	 */
	binding?: string;
}

export type PolicyMapFunction = () => string | PolicyCapabilityDescriptor;

export type PolicyMapEntry =
	| string
	| PolicyCapabilityDescriptor
	| PolicyMapFunction;

export type PolicyMapDefinition = Record<string, PolicyMapEntry>;

export function definePolicyMap(map: PolicyMapDefinition): PolicyMapDefinition {
	return map;
}
