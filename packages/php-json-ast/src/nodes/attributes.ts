import type { PhpArg } from './arguments';
import { createNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpIdentifier } from './identifier';
import type { PhpName } from './name';

export interface PhpAttrGroup extends PhpNode {
	readonly nodeType: 'AttributeGroup';
	readonly attrs: PhpAttribute[];
}

export interface PhpAttribute extends PhpNode {
	readonly nodeType: 'Attribute';
	readonly name: PhpName | PhpIdentifier;
	readonly args: PhpArg[];
}

export function createAttributeGroup(
	attrs: PhpAttribute[],
	attributes?: PhpAttributes
): PhpAttrGroup {
	return createNode<PhpAttrGroup>('AttributeGroup', { attrs }, attributes);
}

export function createAttribute(
	name: PhpName | PhpIdentifier,
	args: PhpArg[],
	attributes?: PhpAttributes
): PhpAttribute {
	return createNode<PhpAttribute>('Attribute', { name, args }, attributes);
}
