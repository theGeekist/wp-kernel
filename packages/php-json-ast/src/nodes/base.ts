/**
 * Shared node primitives that mirror PhpParser's Node\* base classes.
 */

/**
 * Represents the attributes of a PHP AST node.
 *
 * @category PHP AST
 */
export type PhpAttributes = Readonly<Record<string, unknown>>;

const EMPTY_ATTRIBUTES: PhpAttributes = Object.freeze({});

/**
 * Base interface for all PHP AST nodes.
 *
 * @category PHP AST
 */
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

/**
 * Merges new attributes into an existing PHP AST node's attributes.
 *
 * This function creates a new node with the merged attributes if changes are detected,
 * otherwise, it returns the original node to ensure immutability where possible.
 *
 * @category PHP AST
 * @param    node       - The original PHP AST node.
 * @param    attributes - The attributes to merge into the node.
 * @returns A new node with merged attributes, or the original node if no changes.
 */
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
 * Generic factory helper for PHP AST node construction.
 *
 * Prefer dedicated builders exported alongside the node interfaces for specific node types.
 * Use this generic builder for niche constructs that do not yet have a typed factory.
 *
 * @category PHP AST
 * @param    nodeType   - The type of the PHP AST node.
 * @param    props      - The properties of the node, excluding `nodeType` and `attributes`.
 * @param    attributes - Optional attributes for the node.
 * @returns A new PHP AST node of the specified type.
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
