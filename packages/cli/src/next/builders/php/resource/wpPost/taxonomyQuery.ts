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
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildBinaryOperation,
	buildScalarCast,
	buildIfStatementNode,
	buildArrayInitialiserStatement,
} from '../utils';
import { toSnakeCase } from '../../utils';

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

export interface BuildTaxonomyQueryStatementsOptions {
	readonly entries: Array<[string, { taxonomy: string }]>;
}

export function buildTaxonomyQueryStatements(
	options: BuildTaxonomyQueryStatementsOptions
): readonly PhpStmt[] {
	if (options.entries.length === 0) {
		return [];
	}

	const statements: PhpStmt[] = [
		buildArrayInitialiserStatement({ variable: 'tax_query' }),
	];

	for (const [key, descriptor] of options.entries) {
		const variableName = `${toSnakeCase(key)}Terms`;
		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable(variableName),
					buildMethodCall(
						buildVariable('request'),
						buildIdentifier('get_param'),
						[buildArg(buildScalarString(key))]
					)
				)
			)
		);

		statements.push(
			buildIfStatementNode({
				condition: buildBinaryOperation(
					'NotIdentical',
					buildVariable(variableName),
					buildNull()
				),
				statements: buildTaxonomyBranchStatements({
					variableName,
					taxonomy: descriptor.taxonomy,
				}),
			})
		);
	}

	statements.push(
		buildIfStatementNode({
			condition: buildBinaryOperation(
				'Greater',
				buildFuncCall(buildName(['count']), [
					buildArg(buildVariable('tax_query')),
				]),
				buildScalarInt(0)
			),
			statements: [
				buildExpressionStatement(
					buildAssign(
						buildArrayDimFetch(
							'query_args',
							buildScalarString('tax_query')
						),
						buildVariable('tax_query')
					)
				),
			],
		})
	);

	return statements;
}

interface TaxonomyBranchOptions {
	readonly variableName: string;
	readonly taxonomy: string;
}

function buildTaxonomyBranchStatements(
	options: TaxonomyBranchOptions
): readonly PhpStmt[] {
	const sanitise = buildExpressionStatement(
		buildAssign(
			buildVariable(options.variableName),
			buildFuncCall(buildName(['array_filter']), [
				buildArg(
					buildFuncCall(buildName(['array_map']), [
						buildArg(
							buildArrowFunction({
								static: true,
								params: [buildParam(buildVariable('value'))],
								expr: buildScalarCast(
									'int',
									buildVariable('value')
								),
							})
						),
						buildArg(
							buildArrayCast(buildVariable(options.variableName))
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
	);

	const push = buildExpressionStatement(
		buildAssign(
			buildArrayDimFetch('tax_query', null),
			buildArray([
				buildArrayItem(buildScalarString(options.taxonomy), {
					key: buildScalarString('taxonomy'),
				}),
				buildArrayItem(buildScalarString('term_id'), {
					key: buildScalarString('field'),
				}),
				buildArrayItem(buildVariable(options.variableName), {
					key: buildScalarString('terms'),
				}),
			])
		)
	);

	const ensureNonEmpty = buildIfStatementNode({
		condition: buildBinaryOperation(
			'Greater',
			buildFuncCall(buildName(['count']), [
				buildArg(buildVariable(options.variableName)),
			]),
			buildScalarInt(0)
		),
		statements: [push],
	});

	return [sanitise, ensureNonEmpty];
}
