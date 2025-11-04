import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpExpr } from './expressions';
import type { PhpIdentifier } from './identifier';

/**
 * Represents a PHP argument node.
 *
 * @category PHP AST
 */
export interface PhpArg extends PhpNode {
	readonly nodeType: 'Arg';
	readonly value: PhpExpr;
	readonly byRef: boolean;
	readonly unpack: boolean;
	readonly name: PhpIdentifier | null;
}

/**
 * Builds a PHP argument node.
 *
 * @category PHP AST
 * @param    value          - The expression representing the argument's value.
 * @param    options        - Optional configuration for the argument (by reference, unpack, name).
 * @param    options.byRef
 * @param    options.unpack
 * @param    options.name
 * @param    attributes     - Optional attributes for the node.
 * @returns A `PhpArg` node.
 */
export function buildArg(
	value: PhpExpr,
	options: {
		byRef?: boolean;
		unpack?: boolean;
		name?: PhpIdentifier | null;
	} = {},
	attributes?: PhpAttributes
): PhpArg {
	return buildNode<PhpArg>(
		'Arg',
		{
			value,
			byRef: options.byRef ?? false,
			unpack: options.unpack ?? false,
			name: options.name ?? null,
		},
		attributes
	);
}
