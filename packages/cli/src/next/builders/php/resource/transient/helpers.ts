import {
	buildArg,
	buildClassMethod,
	buildIdentifier,
	buildParam,
	buildReturn,
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
import { ensureTransientStorage, resolveTransientKey } from './shared';

export interface BuildTransientHelperMethodsOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly namespace?: string | null;
}

export function buildTransientHelperMethods(
	options: BuildTransientHelperMethodsOptions
): PhpStmtClassMethod[] {
	ensureTransientStorage(options.resource);

	return [
		buildTransientKeyHelper({
			pascalName: options.pascalName,
			key: resolveTransientKey({
				resource: options.resource,
				namespace: options.namespace,
			}),
		}),
		buildTransientExpirationHelper({
			pascalName: options.pascalName,
		}),
	];
}

interface BuildTransientKeyHelperOptions {
	readonly pascalName: string;
	readonly key: string;
}

function buildTransientKeyHelper(
	options: BuildTransientKeyHelperOptions
): PhpStmtClassMethod {
	return buildClassMethod(
		buildIdentifier(`get${options.pascalName}TransientKey`),
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			returnType: buildIdentifier('string'),
			stmts: [buildReturn(buildScalarString(options.key))],
		}
	);
}

interface BuildTransientExpirationHelperOptions {
	readonly pascalName: string;
}

function buildTransientExpirationHelper(
	options: BuildTransientExpirationHelperOptions
): PhpStmtClassMethod {
	const valueVar = normaliseVariableReference('value');
	const sanitisedVar = normaliseVariableReference('sanitised');

	const statements = buildTransientExpirationStatements({
		valueVar,
		sanitisedVar,
	});

	return buildClassMethod(
		buildIdentifier(`normalise${options.pascalName}Expiration`),
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [buildParam(buildVariable(valueVar.raw))],
			returnType: buildIdentifier('int'),
			stmts: statements,
		}
	);
}

interface BuildTransientExpirationStatementsOptions {
	readonly valueVar: ReturnType<typeof normaliseVariableReference>;
	readonly sanitisedVar: ReturnType<typeof normaliseVariableReference>;
}

function buildTransientExpirationStatements(
	options: BuildTransientExpirationStatementsOptions
): PhpStmt[] {
	const statements: PhpStmt[] = [];

	statements.push(
		buildIfStatementNode({
			condition: buildBinaryOperation(
				'Identical',
				buildNull(),
				buildVariable(options.valueVar.raw)
			),
			statements: [buildReturn(buildScalarInt(0))],
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildFunctionCall('is_int', [
				buildArg(buildVariable(options.valueVar.raw)),
			]),
			statements: [
				buildReturn(
					buildFunctionCall('max', [
						buildArg(buildScalarInt(0)),
						buildArg(buildVariable(options.valueVar.raw)),
					])
				),
			],
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildFunctionCall('is_numeric', [
				buildArg(buildVariable(options.valueVar.raw)),
			]),
			statements: [
				buildReturn(
					buildFunctionCall('max', [
						buildArg(buildScalarInt(0)),
						buildArg(
							buildScalarCast(
								'int',
								buildVariable(options.valueVar.raw)
							)
						),
					])
				),
			],
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildBooleanNot(
				buildFunctionCall('is_string', [
					buildArg(buildVariable(options.valueVar.raw)),
				])
			),
			statements: [buildReturn(buildScalarInt(0))],
		})
	);

	statements.push(
		buildVariableAssignment(
			options.sanitisedVar,
			buildFunctionCall('trim', [
				buildArg(
					buildScalarCast(
						'string',
						buildVariable(options.valueVar.raw)
					)
				),
			])
		)
	);

	statements.push(
		buildIfStatementNode({
			condition: buildBinaryOperation(
				'Identical',
				buildScalarString(''),
				buildVariable(options.sanitisedVar.raw)
			),
			statements: [buildReturn(buildScalarInt(0))],
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildFunctionCall('is_numeric', [
				buildArg(buildVariable(options.sanitisedVar.raw)),
			]),
			statements: [
				buildReturn(
					buildFunctionCall('max', [
						buildArg(buildScalarInt(0)),
						buildArg(
							buildScalarCast(
								'int',
								buildVariable(options.sanitisedVar.raw)
							)
						),
					])
				),
			],
		})
	);

	statements.push(buildReturn(buildScalarInt(0)));

	return statements;
}
