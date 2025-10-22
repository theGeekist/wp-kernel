import {
	createArg,
	createArray,
	createArrayCast,
	createArrayItem,
	createArrowFunction,
	createAssign,
	createExpressionStatement,
	createFuncCall,
	createIdentifier,
	createMethodCall,
	createName,
	createNull,
	createParam,
	createScalarInt,
	createScalarString,
	createVariable,
} from '../../../ast/nodes';
import { createPrintable } from '../../../ast/printables';
import { PHP_INDENT } from '../../../ast/templates';
import {
	buildArrayDimFetch,
	buildArrayInitialiser,
	buildBinaryOperation,
	buildIfPrintable,
	buildScalarCast,
} from '../utils';
import { escapeSingleQuotes, toSnakeCase } from '../../../ast/utils';
import type { PhpMethodBodyBuilder } from '../../../ast/templates';

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
		const requestPrintable = createPrintable(
			createExpressionStatement(
				createAssign(
					createVariable(variableName),
					createMethodCall(
						createVariable('request'),
						createIdentifier('get_param'),
						[createArg(createScalarString(key))]
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

		const nestedIndent = PHP_INDENT.repeat(childIndentLevel + 1);
		const pushPrintable = createPrintable(
			createExpressionStatement(
				createAssign(
					buildArrayDimFetch('tax_query', null),
					createArray([
						createArrayItem(
							createScalarString(descriptor.taxonomy),
							{
								key: createScalarString('taxonomy'),
							}
						),
						createArrayItem(createScalarString('term_id'), {
							key: createScalarString('field'),
						}),
						createArrayItem(createVariable(variableName), {
							key: createScalarString('terms'),
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
					createVariable(variableName),
					createNull()
				),
				conditionText: `${indent}if ( null !== $${variableName} ) {`,
				statements: [
					createPrintable(
						createExpressionStatement(
							createAssign(
								createVariable(variableName),
								createFuncCall(createName(['array_filter']), [
									createArg(
										createFuncCall(
											createName(['array_map']),
											[
												createArg(
													createArrowFunction({
														static: true,
														params: [
															createParam(
																createVariable(
																	'value'
																)
															),
														],
														expr: buildScalarCast(
															'int',
															createVariable(
																'value'
															)
														),
													})
												),
												createArg(
													createArrayCast(
														createVariable(
															variableName
														)
													)
												),
											]
										)
									),
									createArg(
										createArrowFunction({
											static: true,
											params: [
												createParam(
													createVariable('value')
												),
											],
											expr: buildBinaryOperation(
												'Greater',
												createVariable('value'),
												createScalarInt(0)
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
					),
					buildIfPrintable({
						indentLevel: childIndentLevel,
						condition: buildBinaryOperation(
							'Greater',
							createFuncCall(createName(['count']), [
								createArg(createVariable(variableName)),
							]),
							createScalarInt(0)
						),
						conditionText: `${childIndent}if ( count( $${variableName} ) > 0 ) {`,
						statements: [pushPrintable],
					}),
				],
			})
		);
	}

	const assignPrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				buildArrayDimFetch(
					'query_args',
					createScalarString('tax_query')
				),
				createVariable('tax_query')
			)
		),
		[`${indent}${PHP_INDENT}$query_args['tax_query'] = $tax_query;`]
	);

	options.body.statement(
		buildIfPrintable({
			indentLevel,
			condition: buildBinaryOperation(
				'Greater',
				createFuncCall(createName(['count']), [
					createArg(createVariable('tax_query')),
				]),
				createScalarInt(0)
			),
			conditionText: `${indent}if ( count( $tax_query ) > 0 ) {`,
			statements: [assignPrintable],
		})
	);
	options.body.blank();
}
