import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpExpr } from './expressions';
import type { PhpIdentifier } from './identifier';

export interface PhpConst extends PhpNode {
	readonly nodeType: 'Const';
	readonly name: PhpIdentifier;
	readonly value: PhpExpr;
}

export function buildConst(
	name: PhpIdentifier,
	value: PhpExpr,
	attributes?: PhpAttributes
): PhpConst {
	return buildNode<PhpConst>('Const', { name, value }, attributes);
}
