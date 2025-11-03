import { buildNode, type PhpAttributes, type PhpNode } from './base';

export interface PhpIdentifier extends PhpNode {
	readonly nodeType: 'Identifier';
	readonly name: string;
}

export function buildIdentifier(
	name: string,
	attributes?: PhpAttributes
): PhpIdentifier {
	return buildNode<PhpIdentifier>('Identifier', { name }, attributes);
}
