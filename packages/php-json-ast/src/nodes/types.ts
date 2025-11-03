import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpIdentifier } from './identifier';
import type { PhpName } from './name';

export interface PhpNullableType extends PhpNode {
	readonly nodeType: 'NullableType';
	readonly type: PhpType;
}

export interface PhpUnionType extends PhpNode {
	readonly nodeType: 'UnionType';
	readonly types: PhpType[];
}

export interface PhpIntersectionType extends PhpNode {
	readonly nodeType: 'IntersectionType';
	readonly types: PhpType[];
}

export type PhpType =
	| PhpIdentifier
	| PhpName
	| PhpNullableType
	| PhpUnionType
	| PhpIntersectionType;

export function buildNullableType(
	type: PhpType,
	attributes?: PhpAttributes
): PhpNullableType {
	return buildNode<PhpNullableType>('NullableType', { type }, attributes);
}
