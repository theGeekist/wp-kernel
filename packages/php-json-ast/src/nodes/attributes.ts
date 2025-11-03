import type { PhpArg } from './arguments';
import { buildNode, type PhpAttributes, type PhpNode } from './base';
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

export function buildAttributeGroup(
	attrs: PhpAttribute[],
	attributes?: PhpAttributes
): PhpAttrGroup {
	return buildNode<PhpAttrGroup>('AttributeGroup', { attrs }, attributes);
}

export function buildAttribute(
	name: PhpName | PhpIdentifier,
	args: PhpArg[],
	attributes?: PhpAttributes
): PhpAttribute {
	return buildNode<PhpAttribute>('Attribute', { name, args }, attributes);
}
