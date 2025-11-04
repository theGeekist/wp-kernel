import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpAttrGroup } from './attributes';
import type { PhpIdentifier } from './identifier';
import type { PhpParam } from './params';
import type { PhpExpr } from './expressions';
import type { PhpStmt } from './stmt';

/**
 * Represents a PHP property hook (e.g., `__get`, `__set`).
 *
 * @category PHP AST
 */
export interface PhpPropertyHook extends PhpNode {
	readonly nodeType: 'PropertyHook';
	readonly attrGroups: PhpAttrGroup[];
	readonly flags: number;
	readonly byRef: boolean;
	readonly name: PhpIdentifier;
	readonly params: PhpParam[];
	readonly body: PhpExpr | PhpStmt[] | null;
}

/**
 * Builds a PHP property hook node.
 *
 * @category PHP AST
 * @param    name               - The name of the property hook (e.g., `__get`, `__set`).
 * @param    body               - The body of the property hook, either an expression or an array of statements.
 * @param    options            - Optional configuration for the property hook (attribute groups, flags, by reference, parameters).
 * @param    options.attrGroups
 * @param    options.flags
 * @param    options.byRef
 * @param    options.params
 * @param    attributes         - Optional attributes for the node.
 * @returns A `PhpPropertyHook` node.
 */
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
