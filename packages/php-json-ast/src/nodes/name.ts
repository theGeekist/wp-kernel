import { createNode, type PhpAttributes, type PhpNode } from './base';

export interface PhpName extends PhpNode {
	readonly nodeType: 'Name' | 'Name_FullyQualified' | 'Name_Relative';
	readonly parts: string[];
}

export function createName(
	parts: string[],
	attributes?: PhpAttributes
): PhpName {
	return createNode<PhpName>('Name', { parts }, attributes);
}

export function createFullyQualifiedName(
	parts: string[],
	attributes?: PhpAttributes
): PhpName {
	return createNode<PhpName>('Name_FullyQualified', { parts }, attributes);
}
