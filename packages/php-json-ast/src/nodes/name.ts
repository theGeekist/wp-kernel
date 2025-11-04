import { buildNode, type PhpAttributes, type PhpNode } from './base';

/**
 * Represents a PHP name node (e.g., namespace, class name).
 *
 * @category PHP AST
 */
export interface PhpName extends PhpNode {
	readonly nodeType: 'Name' | 'Name_FullyQualified' | 'Name_Relative';
	readonly parts: string[];
}

/**
 * Builds a PHP name node.
 *
 * @category PHP AST
 * @param    parts      - An array of strings representing the parts of the name (e.g., ['MyNamespace', 'MyClass']).
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpName` node.
 */
export function buildName(
	parts: string[],
	attributes?: PhpAttributes
): PhpName {
	return buildNode<PhpName>('Name', { parts }, attributes);
}

/**
 * Builds a fully qualified PHP name node.
 *
 * @category PHP AST
 * @param    parts      - An array of strings representing the parts of the fully qualified name.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpName` node with `nodeType` set to 'Name_FullyQualified'.
 */
export function buildFullyQualifiedName(
	parts: string[],
	attributes?: PhpAttributes
): PhpName {
	return buildNode<PhpName>('Name_FullyQualified', { parts }, attributes);
}
