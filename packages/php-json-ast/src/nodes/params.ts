import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpAttrGroup } from './attributes';
import type { PhpExpr } from './expressions';
import type { PhpType } from './types';
import type { PhpPropertyHook } from './propertyHook';

export interface PhpParam extends PhpNode {
	readonly nodeType: 'Param';
	readonly type: PhpType | null;
	readonly byRef: boolean;
	readonly variadic: boolean;
	readonly var: PhpExpr;
	readonly default: PhpExpr | null;
	readonly flags: number;
	readonly attrGroups: PhpAttrGroup[];
	readonly hooks: PhpPropertyHook[];
}

export function buildParam(
	variable: PhpExpr,
	options: {
		type?: PhpType | null;
		byRef?: boolean;
		variadic?: boolean;
		default?: PhpExpr | null;
		flags?: number;
		attrGroups?: PhpAttrGroup[];
		hooks?: PhpPropertyHook[];
	} = {},
	attributes?: PhpAttributes
): PhpParam {
	return buildNode<PhpParam>(
		'Param',
		{
			type: options.type ?? null,
			byRef: options.byRef ?? false,
			variadic: options.variadic ?? false,
			var: variable,
			default: options.default ?? null,
			flags: options.flags ?? 0,
			attrGroups: options.attrGroups ?? [],
			hooks: options.hooks ?? [],
		},
		attributes
	);
}
