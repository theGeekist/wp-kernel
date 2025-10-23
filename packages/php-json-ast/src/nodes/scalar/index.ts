import { buildNode, type PhpAttributes, type PhpNode } from '../base';

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

export function buildScalarString(
	value: string,
	attributes?: PhpAttributes
): PhpScalarString {
	return buildNode<PhpScalarString>('Scalar_String', { value }, attributes);
}

export function buildScalarInt(
	value: number,
	attributes?: PhpAttributes
): PhpScalarLNumber {
	return buildNode<PhpScalarLNumber>('Scalar_LNumber', { value }, attributes);
}

export function buildScalarFloat(
	value: number,
	attributes?: PhpAttributes
): PhpScalarDNumber {
	return buildNode<PhpScalarDNumber>('Scalar_DNumber', { value }, attributes);
}
