import { buildNode, type PhpAttributes, type PhpNode } from './base';
import type { PhpIdentifier } from './identifier';
import type { PhpName } from './name';

/**
 * Represents a nullable PHP type (e.g., `?string`).
 *
 * @category PHP AST
 */
export interface PhpNullableType extends PhpNode {
	readonly nodeType: 'NullableType';
	readonly type: PhpType;
}

/**
 * Represents a PHP union type (e.g., `string|int`).
 *
 * @category PHP AST
 */
export interface PhpUnionType extends PhpNode {
	readonly nodeType: 'UnionType';
	readonly types: PhpType[];
}

/**
 * Represents a PHP intersection type (e.g., `A&B`).
 *
 * @category PHP AST
 */
export interface PhpIntersectionType extends PhpNode {
	readonly nodeType: 'IntersectionType';
	readonly types: PhpType[];
}

/**
 * Represents any valid PHP type node.
 *
 * @category PHP AST
 */
export type PhpType =
	| PhpIdentifier
	| PhpName
	| PhpNullableType
	| PhpUnionType
	| PhpIntersectionType;

/**
 * Builds a nullable PHP type node.
 *
 * @category PHP AST
 * @param    type       - The type node to make nullable.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpNullableType` node.
 */
export function buildNullableType(
	type: PhpType,
	attributes?: PhpAttributes
): PhpNullableType {
	return buildNode<PhpNullableType>('NullableType', { type }, attributes);
}
