import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildAssign,
	buildClassMethod,
	buildExpressionStatement,
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
import type { IRResource } from '../../../../ir/publicTypes';
import {
	buildBinaryOperation,
	buildBooleanNot,
	buildArrayDimFetch,
	buildFunctionCall,
	buildIfStatementNode,
	buildScalarCast,
	buildForeachStatement,
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
	const segmentsVar = normaliseVariableReference('segments');
	const partsVar = normaliseVariableReference('parts');
	const segmentVar = normaliseVariableReference('segment');
	const normalisedVar = normaliseVariableReference('normalised');

	const statements: PhpStmt[] = [];

	statements.push(
		buildVariableAssignment(
			partsVar,
			buildArray([buildArrayItem(buildScalarString(options.key))])
		)
	);

	statements.push(
		buildForeachStatement({
			iterable: buildVariable(segmentsVar.raw),
			value: segmentVar.raw,
			statements: [
				buildIfStatementNode({
					condition: buildBinaryOperation(
						'NotIdentical',
						buildNull(),
						buildVariable(segmentVar.raw)
					),
					statements: [
						buildVariableAssignment(
							normalisedVar,
							buildFunctionCall('trim', [
								buildArg(
									buildScalarCast(
										'string',
										buildVariable(segmentVar.raw)
									)
								),
							])
						),
						buildIfStatementNode({
							condition: buildBooleanNot(
								buildBinaryOperation(
									'Identical',
									buildScalarString(''),
									buildVariable(normalisedVar.raw)
								)
							),
							statements: [
								buildExpressionStatement(
									buildAssign(
										buildArrayDimFetch(partsVar.raw, null),
										buildVariable(normalisedVar.raw)
									)
								),
							],
						}),
					],
				}),
			],
		})
	);

	statements.push(
		buildReturn(
			buildFunctionCall('implode', [
				buildArg(buildScalarString('_')),
				buildArg(buildVariable(partsVar.raw)),
			])
		)
	);

	return buildClassMethod(
		buildIdentifier(`get${options.pascalName}TransientKey`),
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [
				buildParam(buildVariable(segmentsVar.raw), {
					variadic: true,
				}),
			],
			returnType: buildIdentifier('string'),
			stmts: statements,
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
