import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpExpr } from './expressions';
import type { PhpIdentifier } from './identifier';

/**
 * Represents a PHP constant definition (e.g., `const MY_CONST = 123;`).
 *
 * @category PHP AST
 */
export interface PhpConst extends PhpNode {
	readonly nodeType: 'Const';
	readonly name: PhpIdentifier;
	readonly value: PhpExpr;
}

/**
 * Builds a PHP constant node.
 *
 * @category PHP AST
 * @param    name       - The identifier for the constant.
 * @param    value      - The expression representing the constant's value.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpConst` node.
 */
export function buildConst(
	name: PhpIdentifier,
	value: PhpExpr,
	attributes?: PhpAttributes
): PhpConst {
	return buildNode<PhpConst>('Const', { name, value }, attributes);
}
