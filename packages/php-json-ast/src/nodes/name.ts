import { buildNode, type PhpAttributes, type PhpNode } from './base';

export interface PhpName extends PhpNode {
	readonly nodeType: 'Name' | 'Name_FullyQualified' | 'Name_Relative';
	readonly parts: string[];
}

export function buildName(
	parts: string[],
	attributes?: PhpAttributes
): PhpName {
	return buildNode<PhpName>('Name', { parts }, attributes);
}

export function buildFullyQualifiedName(
	parts: string[],
	attributes?: PhpAttributes
): PhpName {
	return buildNode<PhpName>('Name_FullyQualified', { parts }, attributes);
}
