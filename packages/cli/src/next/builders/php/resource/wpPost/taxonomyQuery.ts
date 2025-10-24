import {
	buildArg,
	buildArray,
	buildArrayCast,
	buildArrayItem,
	buildArrowFunction,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildNull,
	buildParam,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	PHP_INDENT,
	toSnakeCase,
} from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildBinaryOperation,
	buildScalarCast,
} from '../utils';
import { buildArrayInitialiser, buildIfPrintable } from '../printable';
import { formatStatementPrintable } from '../printer';
import type { PhpMethodBodyBuilder } from '@wpkernel/php-json-ast';

export interface WpPostTaxonomyConfigEntry {
	readonly taxonomy?: string | null;
}

export interface WpPostTaxonomyQueryConfig {
	readonly taxonomies?: Record<
		string,
		WpPostTaxonomyConfigEntry | null | undefined
	> | null;
}

export function collectTaxonomyQueryEntries(
	storage: WpPostTaxonomyQueryConfig
): Array<[string, { taxonomy: string }]> {
	const entries: Array<[string, { taxonomy: string }]> = [];

	for (const [key, descriptor] of Object.entries(storage.taxonomies ?? {})) {
		if (!descriptor?.taxonomy) {
			continue;
		}

		entries.push([key, { taxonomy: descriptor.taxonomy }]);
	}

	return entries;
}

export interface AppendTaxonomyQueryBuilderOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly entries: Array<[string, { taxonomy: string }]>;
}

export function appendTaxonomyQueryBuilder(
	options: AppendTaxonomyQueryBuilderOptions
): void {
	if (options.entries.length === 0) {
		return;
	}

	const initPrintable = buildArrayInitialiser({
		variable: 'tax_query',
		indentLevel: options.indentLevel,
	});
	options.body.statement(initPrintable);

	for (const [key, descriptor] of options.entries) {
		const variableName = `${toSnakeCase(key)}Terms`;
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

		const sanitisePrintable = formatStatementPrintable(
			buildExpressionStatement(
				buildAssign(
					buildVariable(variableName),
					buildFuncCall(buildName(['array_filter']), [
						buildArg(
							buildFuncCall(buildName(['array_map']), [
								buildArg(
									buildArrowFunction({
										static: true,
										params: [
											buildParam(buildVariable('value')),
										],
										expr: buildScalarCast(
											'int',
											buildVariable('value')
										),
									})
								),
								buildArg(
									buildArrayCast(buildVariable(variableName))
								),
							])
						),
						buildArg(
							buildArrowFunction({
								static: true,
								params: [buildParam(buildVariable('value'))],
								expr: buildBinaryOperation(
									'Greater',
									buildVariable('value'),
									buildScalarInt(0)
								),
							})
						),
					])
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
					buildArrayDimFetch('tax_query', null),
					buildArray([
						buildArrayItem(buildScalarString(descriptor.taxonomy), {
							key: buildScalarString('taxonomy'),
						}),
						buildArrayItem(buildScalarString('term_id'), {
							key: buildScalarString('field'),
						}),
						buildArrayItem(buildVariable(variableName), {
							key: buildScalarString('terms'),
						}),
					])
				)
			),
			{
				indentLevel: childIndentLevel + 1,
				indentUnit: PHP_INDENT,
			}
		);

		options.body.statement(
			buildIfPrintable({
				indentLevel: options.indentLevel,
				condition: buildBinaryOperation(
					'NotIdentical',
					buildVariable(variableName),
					buildNull()
				),
				statements: [
					sanitisePrintable,
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
					}),
				],
			})
		);
	}

	const assignPrintable = formatStatementPrintable(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'query_args',
					buildScalarString('tax_query')
				),
				buildVariable('tax_query')
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
					buildArg(buildVariable('tax_query')),
				]),
				buildScalarInt(0)
			),
			statements: [assignPrintable],
		})
	);
	options.body.blank();
}
