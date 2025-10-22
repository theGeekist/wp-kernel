import { createNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpExpr } from './expressions';
import type { PhpIdentifier } from './identifier';

export interface PhpConst extends PhpNode {
	readonly nodeType: 'Const';
	readonly name: PhpIdentifier;
	readonly value: PhpExpr;
}

export function createConst(
	name: PhpIdentifier,
	value: PhpExpr,
	attributes?: PhpAttributes
): PhpConst {
	return createNode<PhpConst>('Const', { name, value }, attributes);
}
