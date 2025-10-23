import { createNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpExpr } from './expressions';
import { createIdentifier, type PhpIdentifier } from './identifier';

export interface PhpDeclareItem extends PhpNode {
	readonly nodeType: 'DeclareItem';
	readonly key: PhpIdentifier;
	readonly value: PhpExpr;
}

export function createDeclareItem(
	key: string | PhpIdentifier,
	value: PhpExpr,
	attributes?: PhpAttributes
): PhpDeclareItem {
	const identifier = typeof key === 'string' ? createIdentifier(key) : key;
	return createNode<PhpDeclareItem>(
		'DeclareItem',
		{ key: identifier, value },
		attributes
	);
}
