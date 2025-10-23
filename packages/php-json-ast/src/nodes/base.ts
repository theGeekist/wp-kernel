/**
 * Shared node primitives that mirror PhpParser's Node\* base classes.
 */

export type PhpAttributes = Readonly<Record<string, unknown>>;

const EMPTY_ATTRIBUTES: PhpAttributes = Object.freeze({});

export interface PhpNode {
	readonly nodeType: string;
	readonly attributes: PhpAttributes;
}

function normaliseAttributes(attributes?: PhpAttributes): PhpAttributes {
	if (!attributes) {
		return EMPTY_ATTRIBUTES;
	}

	if (attributes === EMPTY_ATTRIBUTES) {
		return attributes;
	}

	const keys = Object.keys(attributes);
	return keys.length === 0 ? EMPTY_ATTRIBUTES : { ...attributes };
}

export function mergeNodeAttributes<T extends PhpNode>(
	node: T,
	attributes?: PhpAttributes
): T {
	if (!attributes || attributes === node.attributes) {
		return node;
	}

	const merged = normaliseAttributes({
		...node.attributes,
		...attributes,
	});

	if (merged === node.attributes) {
		return node;
	}

	return {
		...(node as Record<string, unknown>),
		attributes: merged,
	} as T;
}

/**
 * Generic factory helper for node construction. Prefer dedicated builders
 * exported alongside the node interfaces, but keep this available for niche
 * constructs that do not yet have a typed factory.
 * @param nodeType
 * @param props
 * @param attributes
 */
export function buildNode<T extends PhpNode>(
	nodeType: T['nodeType'],
	props: Omit<T, 'nodeType' | 'attributes'>,
	attributes?: PhpAttributes
): T {
	return {
		nodeType,
		attributes: normaliseAttributes(attributes),
		...(props as Record<string, unknown>),
	} as T;
}
