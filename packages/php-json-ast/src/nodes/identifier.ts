import { createNode, type PhpAttributes, type PhpNode } from './base';

export interface PhpIdentifier extends PhpNode {
	readonly nodeType: 'Identifier';
	readonly name: string;
}

export function createIdentifier(
	name: string,
	attributes?: PhpAttributes
): PhpIdentifier {
	return createNode<PhpIdentifier>('Identifier', { name }, attributes);
}
