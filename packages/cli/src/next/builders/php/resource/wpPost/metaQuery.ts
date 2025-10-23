import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildArrayCast as buildArrayCastNode,
	buildAssign,
	buildArrowFunction,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildMatch,
	buildMatchArm,
	buildMethodCall,
	buildName,
	buildNull,
	buildParam,
	buildScalarBool,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	type PhpExpr,
	type PhpStmt,
	type PhpPrintable,
	type PhpMethodBodyBuilder,
} from '@wpkernel/php-json-ast';
import { PHP_INDENT, toSnakeCase } from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildArrayInitialiser,
	buildBinaryOperation,
	buildBooleanNot,
	buildIfPrintable,
	buildScalarCast,
} from '../utils';
import { formatStatementPrintable } from '../printer';

export interface WpPostMetaConfigEntry {
	readonly single?: boolean | null;
}

export interface WpPostMetaQueryConfig {
	readonly meta?: Record<
		string,
		WpPostMetaConfigEntry | null | undefined
	> | null;
}

export function collectMetaQueryEntries(
	storage: WpPostMetaQueryConfig
): Array<[string, { single?: boolean | null } | undefined]> {
	const entries: Array<[string, { single?: boolean | null } | undefined]> =
		[];

	for (const [key, descriptor] of Object.entries(storage.meta ?? {})) {
		if (!descriptor) {
			entries.push([key, undefined]);
			continue;
		}

		entries.push([key, { single: descriptor.single }]);
	}

	return entries;
}

export interface AppendMetaQueryBuilderOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly entries: Array<[string, { single?: boolean | null } | undefined]>;
}

export function appendMetaQueryBuilder(
	options: AppendMetaQueryBuilderOptions
): void {
	if (options.entries.length === 0) {
		return;
	}

	const initPrintable = buildArrayInitialiser({
		variable: 'meta_query',
		indentLevel: options.indentLevel,
	});
	options.body.statement(initPrintable);

	for (const [key, descriptor] of options.entries) {
		const variableName = `${toSnakeCase(key)}Meta`;
		const requestPrintable = formatStatementPrintable(
			buildExpressionStatement(
				buildAssign(
					buildVariable(variableName),
					buildMethodCall(
						buildVariable('request'),
						buildIdentifier('get_param'),
						[buildArg(buildScalarString(key))]
					)
				)
			),
			{
				indentLevel: options.indentLevel,
				indentUnit: PHP_INDENT,
			}
		);
		options.body.statement(requestPrintable);

		const childIndentLevel = options.indentLevel + 1;
		const innerStatements: PhpPrintable<PhpStmt>[] = [];

		if (descriptor?.single === false) {
			innerStatements.push(
				buildIfPrintable({
					indentLevel: childIndentLevel,
					condition: buildBooleanNot(
						buildFuncCall(buildName(['is_array']), [
							buildArg(buildVariable(variableName)),
						])
					),
					statements: [
						formatStatementPrintable(
							buildExpressionStatement(
								buildAssign(
									buildVariable(variableName),
									buildArray([
										buildArrayItem(
											buildVariable(variableName)
										),
									])
								)
							),
							{
								indentLevel: childIndentLevel,
								indentUnit: PHP_INDENT,
							}
						),
					],
				})
			);

			const normalisePrintable = formatStatementPrintable(
				buildExpressionStatement(
					buildAssign(
						buildVariable(variableName),
						buildFuncCall(buildName(['array_values']), [
							buildArg(
								buildArrayCastNode(buildVariable(variableName))
							),
						])
					)
				),
				{
					indentLevel: childIndentLevel,
					indentUnit: PHP_INDENT,
				}
			);

			const filterPrintable = formatStatementPrintable(
				buildExpressionStatement(
					buildAssign(
						buildVariable(variableName),
						buildFuncCall(buildName(['array_filter']), [
							buildArg(buildVariable(variableName)),
							buildArg(createStaticTrimFilterClosure()),
						])
					)
				),
				{
					indentLevel: childIndentLevel,
					indentUnit: PHP_INDENT,
				}
			);

			innerStatements.push(normalisePrintable, filterPrintable);

			const pushPrintable = formatStatementPrintable(
				buildExpressionStatement(
					buildAssign(
						buildArrayDimFetch('meta_query', null),
						buildArray([
							buildArrayItem(buildScalarString(key), {
								key: buildScalarString('key'),
							}),
							buildArrayItem(buildScalarString('IN'), {
								key: buildScalarString('compare'),
							}),
							buildArrayItem(buildVariable(variableName), {
								key: buildScalarString('value'),
							}),
						])
					)
				),
				{
					indentLevel: childIndentLevel + 1,
					indentUnit: PHP_INDENT,
				}
			);

			innerStatements.push(
				buildIfPrintable({
					indentLevel: childIndentLevel,
					condition: buildBinaryOperation(
						'Greater',
						buildFuncCall(buildName(['count']), [
							buildArg(buildVariable(variableName)),
						]),
						buildScalarInt(0)
					),
					statements: [pushPrintable],
				})
			);
		} else {
			const sanitisePrintable = formatStatementPrintable(
				buildExpressionStatement(
					buildAssign(
						buildVariable(variableName),
						buildMatch(
							buildFuncCall(buildName(['is_scalar']), [
								buildArg(buildVariable(variableName)),
							]),
							[
								buildMatchArm(
									[buildScalarBool(true)],
									buildFuncCall(buildName(['trim']), [
										buildArg(
											buildScalarCast(
												'string',
												buildVariable(variableName)
											)
										),
									])
								),
								buildMatchArm(null, buildNull()),
							]
						)
					)
				),
				{
					indentLevel: childIndentLevel,
					indentUnit: PHP_INDENT,
				}
			);

			const pushPrintable = formatStatementPrintable(
				buildExpressionStatement(
					buildAssign(
						buildArrayDimFetch('meta_query', null),
						buildArray([
							buildArrayItem(buildScalarString(key), {
								key: buildScalarString('key'),
							}),
							buildArrayItem(buildScalarString('='), {
								key: buildScalarString('compare'),
							}),
							buildArrayItem(buildVariable(variableName), {
								key: buildScalarString('value'),
							}),
						])
					)
				),
				{
					indentLevel: childIndentLevel + 1,
					indentUnit: PHP_INDENT,
				}
			);

			innerStatements.push(
				sanitisePrintable,
				buildIfPrintable({
					indentLevel: childIndentLevel,
					condition: buildBinaryOperation(
						'BooleanAnd',
						buildBinaryOperation(
							'NotIdentical',
							buildVariable(variableName),
							buildNull()
						),
						buildBinaryOperation(
							'NotIdentical',
							buildVariable(variableName),
							buildScalarString('')
						)
					),
					statements: [pushPrintable],
				})
			);
		}

		options.body.statement(
			buildIfPrintable({
				indentLevel: options.indentLevel,
				condition: buildBinaryOperation(
					'NotIdentical',
					buildVariable(variableName),
					buildNull()
				),
				statements: innerStatements,
			})
		);
	}

	const assignPrintable = formatStatementPrintable(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'query_args',
					buildScalarString('meta_query')
				),
				buildVariable('meta_query')
			)
		),
		{
			indentLevel: options.indentLevel + 1,
			indentUnit: PHP_INDENT,
		}
	);

	options.body.statement(
		buildIfPrintable({
			indentLevel: options.indentLevel,
			condition: buildBinaryOperation(
				'Greater',
				buildFuncCall(buildName(['count']), [
					buildArg(buildVariable('meta_query')),
				]),
				buildScalarInt(0)
			),
			statements: [assignPrintable],
		})
	);
	options.body.blank();
}

function createStaticTrimFilterClosure(): PhpExpr {
	const parameter = buildParam(buildVariable('value'));
	const trimmedValue = buildFuncCall(buildName(['trim']), [
		buildArg(buildScalarCast('string', buildVariable('value'))),
	]);

	return buildArrowFunction({
		static: true,
		params: [parameter],
		expr: buildMatch(trimmedValue, [
			buildMatchArm([buildScalarString('')], buildScalarBool(false)),
			buildMatchArm(null, buildScalarBool(true)),
		]),
	});
}
