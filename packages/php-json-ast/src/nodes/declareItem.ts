import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpExpr } from './expressions';
import { buildIdentifier, type PhpIdentifier } from './identifier';

/**
 * Represents a PHP declare item (e.g., `encoding='UTF-8'` in `declare(encoding='UTF-8');`).
 *
 * @category PHP AST
 */
export interface PhpDeclareItem extends PhpNode {
	readonly nodeType: 'DeclareItem';
	readonly key: PhpIdentifier;
	readonly value: PhpExpr;
}

/**
 * Builds a PHP declare item node.
 *
 * @category PHP AST
 * @param    key        - The key of the declare item, either a string or a `PhpIdentifier`.
 * @param    value      - The expression representing the value of the declare item.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpDeclareItem` node.
 */
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
