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
	buildPrintable,
	PHP_INDENT,
	escapeSingleQuotes,
	toSnakeCase,
} from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildArrayInitialiser,
	buildBinaryOperation,
	buildIfPrintable,
	buildScalarCast,
} from '../utils';
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

	const indentLevel = options.indentLevel;
	const indent = PHP_INDENT.repeat(indentLevel);

	const initPrintable = buildArrayInitialiser({
		variable: 'tax_query',
		indentLevel,
	});
	options.body.statement(initPrintable);

	for (const [key, descriptor] of options.entries) {
		const variableName = `${toSnakeCase(key)}Terms`;
		const requestPrintable = buildPrintable(
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
			[
				`${indent}$${variableName} = $request->get_param( '${escapeSingleQuotes(key)}' );`,
			]
		);
		options.body.statement(requestPrintable);

		const childIndentLevel = indentLevel + 1;
		const childIndent = PHP_INDENT.repeat(childIndentLevel);

		const sanitisePrintable = buildPrintable(
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
			[
				`${childIndent}$${variableName} = array_filter(`,
				`${childIndent}${PHP_INDENT}array_map(`,
				`${childIndent}${PHP_INDENT}${PHP_INDENT}static fn ( $value ) => (int) $value,`,
				`${childIndent}${PHP_INDENT}${PHP_INDENT}(array) $${variableName}`,
				`${childIndent}${PHP_INDENT}),`,
				`${childIndent}${PHP_INDENT}static fn ( $value ) => $value > 0`,
				`${childIndent});`,
			]
		);

		const nestedIndent = PHP_INDENT.repeat(childIndentLevel + 1);
		const pushPrintable = buildPrintable(
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
			[
				`${nestedIndent}$tax_query[] = [`,
				`${nestedIndent}${PHP_INDENT}'taxonomy' => '${escapeSingleQuotes(descriptor.taxonomy)}',`,
				`${nestedIndent}${PHP_INDENT}'field' => 'term_id',`,
				`${nestedIndent}${PHP_INDENT}'terms' => $${variableName},`,
				`${nestedIndent}];`,
			]
		);

		options.body.statement(
			buildIfPrintable({
				indentLevel,
				condition: buildBinaryOperation(
					'NotIdentical',
					buildVariable(variableName),
					buildNull()
				),
				conditionText: `${indent}if ( null !== $${variableName} ) {`,
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
						conditionText: `${childIndent}if ( count( $${variableName} ) > 0 ) {`,
						statements: [pushPrintable],
					}),
				],
			})
		);
	}

	const assignPrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildArrayDimFetch(
					'query_args',
					buildScalarString('tax_query')
				),
				buildVariable('tax_query')
			)
		),
		[`${indent}${PHP_INDENT}$query_args['tax_query'] = $tax_query;`]
	);

	options.body.statement(
		buildIfPrintable({
			indentLevel,
			condition: buildBinaryOperation(
				'Greater',
				buildFuncCall(buildName(['count']), [
					buildArg(buildVariable('tax_query')),
				]),
				buildScalarInt(0)
			),
			conditionText: `${indent}if ( count( $tax_query ) > 0 ) {`,
			statements: [assignPrintable],
		})
	);
	options.body.blank();
}
