import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildClassMethod,
	buildIdentifier,
	buildNullableType,
	buildParam,
	buildReturn,
	buildScalarBool,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	buildNull,
	PHP_METHOD_MODIFIER_PRIVATE,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../ir/types';
import {
	buildBinaryOperation,
	buildBooleanNot,
	buildFunctionCall,
	buildIfStatementNode,
	buildScalarCast,
	buildVariableAssignment,
	normaliseVariableReference,
} from '../utils';
import { ensureWpOptionStorage } from './shared';

export interface BuildWpOptionHelperMethodsOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
}

export function buildWpOptionHelperMethods(
	options: BuildWpOptionHelperMethodsOptions
): PhpStmtClassMethod[] {
	const storage = ensureWpOptionStorage(options.resource);

	return [
		buildGetOptionNameHelper({
			pascalName: options.pascalName,
			optionName: storage.option,
		}),
		buildNormaliseAutoloadHelper({
			pascalName: options.pascalName,
		}),
	];
}

interface BuildGetOptionNameHelperOptions {
	readonly pascalName: string;
	readonly optionName: string;
}

function buildGetOptionNameHelper(
	options: BuildGetOptionNameHelperOptions
): PhpStmtClassMethod {
	return buildClassMethod(
		buildIdentifier(`get${options.pascalName}OptionName`),
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			returnType: buildIdentifier('string'),
			stmts: [buildReturn(buildScalarString(options.optionName))],
		}
	);
}

interface BuildNormaliseAutoloadHelperOptions {
	readonly pascalName: string;
}

function buildNormaliseAutoloadHelper(
	options: BuildNormaliseAutoloadHelperOptions
): PhpStmtClassMethod {
	const valueVar = normaliseVariableReference('value');
	const normalisedVar = normaliseVariableReference('normalised');

	const statements: PhpStmt[] = [];

	statements.push(
		buildIfStatementNode({
			condition: buildBinaryOperation(
				'Identical',
				buildNull(),
				buildVariable(valueVar.raw)
			),
			statements: [buildReturn(buildNull())],
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildFunctionCall('is_bool', [
				buildArg(buildVariable(valueVar.raw)),
			]),
			statements: [
				buildIfStatementNode({
					condition: buildVariable(valueVar.raw),
					statements: [buildReturn(buildScalarString('yes'))],
				}),
				buildReturn(buildScalarString('no')),
			],
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildFunctionCall('is_numeric', [
				buildArg(buildVariable(valueVar.raw)),
			]),
			statements: [
				buildIfStatementNode({
					condition: buildBinaryOperation(
						'Identical',
						buildScalarCast('int', buildVariable(valueVar.raw)),
						buildScalarInt(1)
					),
					statements: [buildReturn(buildScalarString('yes'))],
				}),
				buildReturn(buildScalarString('no')),
			],
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildBooleanNot(
				buildFunctionCall('is_string', [
					buildArg(buildVariable(valueVar.raw)),
				])
			),
			statements: [buildReturn(buildNull())],
		})
	);

	statements.push(
		buildVariableAssignment(
			normalisedVar,
			buildFunctionCall('strtolower', [
				buildArg(
					buildFunctionCall('trim', [
						buildArg(
							buildScalarCast(
								'string',
								buildVariable(valueVar.raw)
							)
						),
					])
				),
			])
		)
	);

	statements.push(
		buildIfStatementNode({
			condition: buildFunctionCall('in_array', [
				buildArg(buildVariable(normalisedVar.raw)),
				buildArg(
					buildArray([
						buildArrayItem(buildScalarString('1')),
						buildArrayItem(buildScalarString('true')),
						buildArrayItem(buildScalarString('yes')),
					])
				),
				buildArg(buildScalarBool(true)),
			]),
			statements: [buildReturn(buildScalarString('yes'))],
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildFunctionCall('in_array', [
				buildArg(buildVariable(normalisedVar.raw)),
				buildArg(
					buildArray([
						buildArrayItem(buildScalarString('0')),
						buildArrayItem(buildScalarString('false')),
						buildArrayItem(buildScalarString('no')),
					])
				),
				buildArg(buildScalarBool(true)),
			]),
			statements: [buildReturn(buildScalarString('no'))],
		})
	);

	statements.push(buildReturn(buildNull()));

	return buildClassMethod(
		buildIdentifier(`normalise${options.pascalName}Autoload`),
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [buildParam(buildVariable(valueVar.raw))],
			returnType: buildNullableType(buildIdentifier('string')),
			stmts: statements,
		}
	);
}
