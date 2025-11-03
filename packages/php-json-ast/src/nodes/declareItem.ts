import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpExpr } from './expressions';
import { buildIdentifier, type PhpIdentifier } from './identifier';

export interface PhpDeclareItem extends PhpNode {
	readonly nodeType: 'DeclareItem';
	readonly key: PhpIdentifier;
	readonly value: PhpExpr;
}

export function buildDeclareItem(
	key: string | PhpIdentifier,
	value: PhpExpr,
	attributes?: PhpAttributes
): PhpDeclareItem {
	const identifier = typeof key === 'string' ? buildIdentifier(key) : key;
	return buildNode<PhpDeclareItem>(
		'DeclareItem',
		{ key: identifier, value },
		attributes
	);
}
