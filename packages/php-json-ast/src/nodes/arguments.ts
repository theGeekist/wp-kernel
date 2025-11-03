import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpExpr } from './expressions';
import type { PhpIdentifier } from './identifier';

export interface PhpArg extends PhpNode {
	readonly nodeType: 'Arg';
	readonly value: PhpExpr;
	readonly byRef: boolean;
	readonly unpack: boolean;
	readonly name: PhpIdentifier | null;
}

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
