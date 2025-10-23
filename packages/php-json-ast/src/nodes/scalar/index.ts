import { createNode, type PhpAttributes, type PhpNode } from '../base';

export interface PhpScalarBase extends PhpNode {
	readonly nodeType: `Scalar_${string}`;
}

export interface PhpScalarString extends PhpScalarBase {
	readonly nodeType: 'Scalar_String';
	readonly value: string;
}

export interface PhpScalarLNumber extends PhpScalarBase {
	readonly nodeType: 'Scalar_LNumber';
	readonly value: number;
}

export interface PhpScalarDNumber extends PhpScalarBase {
	readonly nodeType: 'Scalar_DNumber';
	readonly value: number;
}

export interface PhpScalarMagicConst extends PhpScalarBase {
	readonly nodeType: `Scalar_MagicConst_${string}`;
}

export type PhpScalar =
	| PhpScalarString
	| PhpScalarLNumber
	| PhpScalarDNumber
	| PhpScalarMagicConst
	| PhpScalarBase;

export function createScalarString(
	value: string,
	attributes?: PhpAttributes
): PhpScalarString {
	return createNode<PhpScalarString>('Scalar_String', { value }, attributes);
}

export function createScalarInt(
	value: number,
	attributes?: PhpAttributes
): PhpScalarLNumber {
	return createNode<PhpScalarLNumber>(
		'Scalar_LNumber',
		{ value },
		attributes
	);
}

export function createScalarFloat(
	value: number,
	attributes?: PhpAttributes
): PhpScalarDNumber {
	return createNode<PhpScalarDNumber>(
		'Scalar_DNumber',
		{ value },
		attributes
	);
}
