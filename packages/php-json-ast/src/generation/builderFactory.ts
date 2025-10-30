import type { PhpProgram, PhpStmt } from '../nodes/stmt';
import type { PhpExpr } from '../nodes/expressions';
import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildNew,
	buildPropertyFetch,
	buildReturn,
	buildVariable,
	type PhpArg,
	type PhpExprAssign,
} from '../nodes';
import { buildIdentifier } from '../nodes/identifier';
import {
	buildFullyQualifiedName,
	buildName,
	type PhpName,
} from '../nodes/name';
import {
	buildScalarFloat,
	buildScalarInt,
	buildScalarString,
} from '../nodes/scalar';
import { buildNull, buildScalarBool } from '../nodes/expressions';
import type { PhpType } from '../nodes/types';

export interface PhpBuilderFactoryNamespaceIntent {
	readonly name: string;
	readonly docblock?: readonly string[];
}

export type PhpBuilderFactoryUseKind = 'normal' | 'function' | 'const';

export interface PhpBuilderFactoryUseIntent {
	readonly name: string;
	readonly alias?: string | null;
	readonly kind?: PhpBuilderFactoryUseKind;
}

export interface PhpBuilderFactoryLiteralString {
	readonly kind: 'string';
	readonly value: string;
}

export interface PhpBuilderFactoryLiteralInt {
	readonly kind: 'int';
	readonly value: number;
}

export interface PhpBuilderFactoryLiteralFloat {
	readonly kind: 'float';
	readonly value: number;
}

export interface PhpBuilderFactoryLiteralBool {
	readonly kind: 'bool';
	readonly value: boolean;
}

export interface PhpBuilderFactoryLiteralNull {
	readonly kind: 'null';
}

export type PhpBuilderFactoryLiteral =
	| PhpBuilderFactoryLiteralString
	| PhpBuilderFactoryLiteralInt
	| PhpBuilderFactoryLiteralFloat
	| PhpBuilderFactoryLiteralBool
	| PhpBuilderFactoryLiteralNull;

export interface PhpBuilderFactoryArgumentParameter {
	readonly kind: 'parameter';
	readonly name: string;
}

export interface PhpBuilderFactoryArgumentLiteral {
	readonly kind: 'literal';
	readonly literal: PhpBuilderFactoryLiteral;
}

export type PhpBuilderFactoryArgument =
	| PhpBuilderFactoryArgumentParameter
	| PhpBuilderFactoryArgumentLiteral;

export interface PhpBuilderFactoryMethodAssignPropertyStep {
	readonly kind: 'assignPropertyFromParameter';
	readonly property: string;
	readonly parameter: string;
}

export interface PhpBuilderFactoryMethodReturnPropertyStep {
	readonly kind: 'returnProperty';
	readonly property: string;
}

export interface PhpBuilderFactoryMethodReturnNewStep {
	readonly kind: 'returnNew';
	readonly className: string;
	readonly arguments?: readonly PhpBuilderFactoryArgument[];
}

export type PhpBuilderFactoryMethodStep =
	| PhpBuilderFactoryMethodAssignPropertyStep
	| PhpBuilderFactoryMethodReturnPropertyStep
	| PhpBuilderFactoryMethodReturnNewStep;

export interface PhpBuilderFactoryMethodIntent {
	readonly name: string;
	readonly visibility?: 'public' | 'protected' | 'private';
	readonly isStatic?: boolean;
	readonly returnType?: string | null;
	readonly parameters?: readonly PhpBuilderFactoryParameterIntent[];
	readonly docblock?: readonly string[];
	readonly body?: readonly PhpBuilderFactoryMethodStep[];
}

export interface PhpBuilderFactoryParameterIntent {
	readonly name: string;
	readonly type?: string | null;
	readonly default?: PhpBuilderFactoryLiteral;
}

export interface PhpBuilderFactoryPropertyIntent {
	readonly name: string;
	readonly visibility?: 'public' | 'protected' | 'private';
	readonly type?: string | null;
	readonly default?: PhpBuilderFactoryLiteral;
	readonly isStatic?: boolean;
	readonly isReadonly?: boolean;
	readonly docblock?: readonly string[];
}

export interface PhpBuilderFactoryClassIntent {
	readonly name: string;
	readonly docblock?: readonly string[];
	readonly isFinal?: boolean;
	readonly isAbstract?: boolean;
	readonly extends?: string | null;
	readonly implements?: readonly string[];
	readonly properties?: readonly PhpBuilderFactoryPropertyIntent[];
	readonly methods?: readonly PhpBuilderFactoryMethodIntent[];
}

export interface PhpBuilderFactoryFileIntent {
	readonly file: string;
	readonly namespace: PhpBuilderFactoryNamespaceIntent;
	readonly uses?: readonly PhpBuilderFactoryUseIntent[];
	readonly class: PhpBuilderFactoryClassIntent;
}

export interface PhpBuilderFactoryIntent {
	readonly files: readonly PhpBuilderFactoryFileIntent[];
}

export function isPhpBuilderFactoryIntentEmpty(
	intent: PhpBuilderFactoryIntent
): boolean {
	return intent.files.length === 0;
}

export function serialisePhpBuilderFactoryIntent(
	intent: PhpBuilderFactoryIntent
): string {
	return `${JSON.stringify(intent, null, 2)}\n`;
}

export function derivePhpTypeFromString(
	type: string | null | undefined
): PhpType | null {
	if (!type) {
		return null;
	}

	if (type.startsWith('\\')) {
		const parts = type.replace(/^\\/u, '').split('\\');
		return buildFullyQualifiedName(parts);
	}

	if (type.includes('\\')) {
		const parts = type.split('\\');
		return buildName(parts);
	}

	return buildIdentifier(type);
}

export function derivePhpNameFromString(name: string): PhpName {
	if (name.startsWith('\\')) {
		const parts = name.replace(/^\\/u, '').split('\\');
		return buildFullyQualifiedName(parts);
	}

	const parts = name.split('\\');
	return buildName(parts);
}

export function convertLiteralToExpression(
	literal: PhpBuilderFactoryLiteral
): PhpExpr {
	switch (literal.kind) {
		case 'string':
			return buildScalarString(literal.value);
		case 'int':
			return buildScalarInt(literal.value);
		case 'float':
			return buildScalarFloat(literal.value);
		case 'bool':
			return buildScalarBool(literal.value);
		case 'null':
			return buildNull();
		default: {
			const exhaustiveCheck: never = literal;
			throw new Error(
				`Unsupported literal kind: ${(exhaustiveCheck as { kind: string }).kind}`
			);
		}
	}
}

export function convertBuilderIntentToArgument(
	argument: PhpBuilderFactoryArgument
): PhpArg {
	switch (argument.kind) {
		case 'parameter':
			return buildArg(buildVariable(argument.name));
		case 'literal':
			return buildArg(convertLiteralToExpression(argument.literal));
		default: {
			const exhaustiveCheck: never = argument;
			throw new Error(
				`Unsupported argument kind: ${(exhaustiveCheck as { kind: string }).kind}`
			);
		}
	}
}

export function expandMethodStepToStatements(
	step: PhpBuilderFactoryMethodStep
): readonly PhpStmt[] {
	switch (step.kind) {
		case 'assignPropertyFromParameter': {
			const propertyFetch = buildPropertyFetch(
				buildVariable('this'),
				buildIdentifier(step.property)
			);
			const assignment = buildAssign(
				propertyFetch,
				buildVariable(step.parameter)
			) as PhpExprAssign;
			return [buildExpressionStatement(assignment)];
		}
		case 'returnProperty': {
			const propertyFetch = buildPropertyFetch(
				buildVariable('this'),
				buildIdentifier(step.property)
			);
			return [buildReturn(propertyFetch)];
		}
		case 'returnNew': {
			const target = derivePhpNameFromString(step.className);
			const args = (step.arguments ?? []).map((argument) =>
				convertBuilderIntentToArgument(argument)
			);
			return [buildReturn(buildNew(target, args))];
		}
		default: {
			const exhaustiveCheck: never = step;
			throw new Error(
				`Unsupported method step: ${(exhaustiveCheck as { kind: string }).kind}`
			);
		}
	}
}

export function flattenMethodSteps(
	steps: readonly PhpBuilderFactoryMethodStep[] | undefined
): readonly PhpStmt[] {
	if (!steps || steps.length === 0) {
		return [];
	}

	return steps.flatMap((step) => expandMethodStepToStatements(step));
}

export function assemblePhpProgramFromBuilderFactory(
	statements: readonly PhpStmt[]
): PhpProgram {
	return [...statements];
}
