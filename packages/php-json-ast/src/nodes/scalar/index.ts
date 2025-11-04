import { buildNode, type PhpAttributes, type PhpNode } from '../base';

/**
 * Base interface for all PHP scalar nodes.
 *
 * @category PHP AST
 */
export interface PhpScalarBase extends PhpNode {
	readonly nodeType: `Scalar_${string}`;
}

/**
 * Represents a PHP string scalar node.
 *
 * @category PHP AST
 */
export interface PhpScalarString extends PhpScalarBase {
	readonly nodeType: 'Scalar_String';
	readonly value: string;
}

/**
 * Represents a PHP integer scalar node.
 *
 * @category PHP AST
 */
export interface PhpScalarLNumber extends PhpScalarBase {
	readonly nodeType: 'Scalar_Int';
	readonly value: number;
}

/**
 * Represents a PHP float scalar node.
 *
 * @category PHP AST
 */
export interface PhpScalarDNumber extends PhpScalarBase {
	readonly nodeType: 'Scalar_Float';
	readonly value: number;
}

/**
 * Represents a PHP magic constant scalar node (e.g., `__FILE__`, `__LINE__`).
 *
 * @category PHP AST
 */
export interface PhpScalarMagicConst extends PhpScalarBase {
	readonly nodeType: `Scalar_MagicConst_${string}`;
}

/**
 * Represents any PHP scalar node.
 *
 * @category PHP AST
 */
export type PhpScalar =
	| PhpScalarString
	| PhpScalarLNumber
	| PhpScalarDNumber
	| PhpScalarMagicConst
	| PhpScalarBase;

/**
 * Builds a PHP string scalar node.
 *
 * @category PHP AST
 * @param    value      - The string value.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpScalarString` node.
 */
export function buildScalarString(
	value: string,
	attributes?: PhpAttributes
): PhpScalarString {
	return buildNode<PhpScalarString>('Scalar_String', { value }, attributes);
}

/**
 * Builds a PHP integer scalar node.
 *
 * @category PHP AST
 * @param    value      - The integer value.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpScalarLNumber` node.
 */
export function buildScalarInt(
	value: number,
	attributes?: PhpAttributes
): PhpScalarLNumber {
	return buildNode<PhpScalarLNumber>('Scalar_Int', { value }, attributes);
}

/**
 * Builds a PHP float scalar node.
 *
 * @category PHP AST
 * @param    value      - The float value.
 * @param    attributes - Optional attributes for the node.
 * @returns A `PhpScalarDNumber` node.
 */
export function buildScalarFloat(
	value: number,
	attributes?: PhpAttributes
): PhpScalarDNumber {
	return buildNode<PhpScalarDNumber>('Scalar_Float', { value }, attributes);
}
