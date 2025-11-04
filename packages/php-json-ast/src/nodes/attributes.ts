import type { PhpArg } from './arguments';
import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpIdentifier } from './identifier';
import type { PhpName } from './name';

/**
 * Represents a group of PHP attributes (e.g., `#[Attr1, Attr2]`).
 *
 * @category PHP AST
 */
export interface PhpAttrGroup extends PhpNode {
	readonly nodeType: 'AttributeGroup';
	readonly attrs: PhpAttribute[];
}

/**
 * Represents a single PHP attribute (e.g., `#[MyAttribute(arg: value)]`).
 *
 * @category PHP AST
 */
export interface PhpAttribute extends PhpNode {
	readonly nodeType: 'Attribute';
	readonly name: PhpName | PhpIdentifier;
	readonly args: PhpArg[];
}

/**
 * Builds a PHP attribute group node.
 *
 * @category PHP AST
 * @param    attrs      - An array of `PhpAttribute` nodes within the group.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpAttrGroup` node.
 */
export function buildAttributeGroup(
	attrs: PhpAttribute[],
	attributes?: PhpAttributes
): PhpAttrGroup {
	return buildNode<PhpAttrGroup>('AttributeGroup', { attrs }, attributes);
}

/**
 * Builds a PHP attribute node.
 *
 * @category PHP AST
 * @param    name       - The name of the attribute (e.g., `PhpName` or `PhpIdentifier`).
 * @param    args       - An array of `PhpArg` nodes representing the attribute's arguments.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpAttribute` node.
 */
export function buildAttribute(
	name: PhpName | PhpIdentifier,
	args: PhpArg[],
	attributes?: PhpAttributes
): PhpAttribute {
	return buildNode<PhpAttribute>('Attribute', { name, args }, attributes);
}
