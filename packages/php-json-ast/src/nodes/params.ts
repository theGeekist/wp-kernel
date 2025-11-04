import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpAttrGroup } from './attributes';
import type { PhpExpr } from './expressions';
import type { PhpType } from './types';
import type { PhpPropertyHook } from './propertyHook';

/**
 * Represents a PHP parameter node in a function or method signature.
 *
 * @category PHP AST
 */
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

/**
 * Builds a PHP parameter node.
 *
 * @category PHP AST
 * @param    variable           - The variable expression for the parameter.
 * @param    options            - Optional configuration for the parameter (type, by reference, variadic, default value, flags, attribute groups, hooks).
 * @param    options.type
 * @param    options.byRef
 * @param    options.variadic
 * @param    options.default
 * @param    options.flags
 * @param    options.attrGroups
 * @param    options.hooks
 * @param    attributes         - Optional attributes for the node.
 * @returns A `PhpParam` node.
 */
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
