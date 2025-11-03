import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpAttrGroup } from './attributes';
import type { PhpIdentifier } from './identifier';
import type { PhpParam } from './params';
import type { PhpExpr } from './expressions';
import type { PhpStmt } from './stmt';

export interface PhpPropertyHook extends PhpNode {
	readonly nodeType: 'PropertyHook';
	readonly attrGroups: PhpAttrGroup[];
	readonly flags: number;
	readonly byRef: boolean;
	readonly name: PhpIdentifier;
	readonly params: PhpParam[];
	readonly body: PhpExpr | PhpStmt[] | null;
}

export function buildPropertyHook(
	name: PhpIdentifier,
	body: PhpExpr | PhpStmt[] | null,
	options: {
		attrGroups?: PhpAttrGroup[];
		flags?: number;
		byRef?: boolean;
		params?: PhpParam[];
	} = {},
	attributes?: PhpAttributes
): PhpPropertyHook {
	return buildNode<PhpPropertyHook>(
		'PropertyHook',
		{
			name,
			body,
			attrGroups: options.attrGroups ?? [],
			flags: options.flags ?? 0,
			byRef: options.byRef ?? false,
			params: options.params ?? [],
		},
		attributes
	);
}
