import { buildNode, type PhpAttributes, type PhpNode } from './base';

/**
 * Represents a PHP identifier node.
 *
 * @category PHP AST
 */
export interface PhpIdentifier extends PhpNode {
	readonly nodeType: 'Identifier';
	readonly name: string;
}

/**
 * Builds a PHP identifier node.
 *
 * @category PHP AST
 * @param    name       - The name of the identifier.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpIdentifier` node.
 */
export function buildIdentifier(
	name: string,
	attributes?: PhpAttributes
): PhpIdentifier {
	return buildNode<PhpIdentifier>('Identifier', { name }, attributes);
}
