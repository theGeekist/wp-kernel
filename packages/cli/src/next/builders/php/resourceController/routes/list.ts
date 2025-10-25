import {
	buildArray,
	buildArrayItem,
	buildAssign,
	buildExpressionStatement,
	buildIdentifier,
	buildMethodCall,
	buildReturn,
	buildScalarCast,
	buildScalarString,
	buildStmtNop,
	buildVariable,
	isNonEmptyString,
	type PhpStmt,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import {
	buildMetaQueryStatements,
	buildTaxonomyQueryStatements,
	collectMetaQueryEntries,
	collectTaxonomyQueryEntries,
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
	createPageExpression,
	createPaginationNormalisationStatements,
	buildPropertyFetch,
	createQueryArgsAssignmentStatement,
	createWpQueryExecutionStatement,
	variable,
	buildWpTaxonomyListRouteStatements,
} from '../../resource';
import type { IRResource } from '../../../../../ir/types';

export interface BuildListRouteStatementsOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildListRouteStatements(
	options: BuildListRouteStatementsOptions
): PhpStmt[] | null {
	const storage = options.resource.storage;
	if (!storage) {
		return null;
	}

	if (storage.mode === 'wp-taxonomy') {
		return buildWpTaxonomyListRouteStatements({
			resource: options.resource,
			pascalName: options.pascalName,
			metadataHost: options.metadataHost,
			cacheSegments: options.cacheSegments,
		});
	}

	if (storage.mode !== 'wp-post') {
		return null;
	}

	const statements: PhpStmt[] = [];

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable('post_type'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`get${options.pascalName}PostType`),
					[]
				)
			)
		)
	);

	const [perPageAssign, ensurePositive, clampMaximum] =
		createPaginationNormalisationStatements({
			requestVariable: '$request',
			targetVariable: 'per_page',
		});

	statements.push(
		perPageAssign,
		ensurePositive,
		clampMaximum,
		buildStmtNop()
	);

	const statuses = Array.isArray(storage.statuses)
		? storage.statuses.filter(isNonEmptyString)
		: [];

	if (statuses.length > 0) {
		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable('statuses'),
					buildMethodCall(
						buildVariable('this'),
						buildIdentifier(`get${options.pascalName}Statuses`),
						[]
					)
				)
			)
		);
		statements.push(buildStmtNop());
	}

	const metaEntries = collectMetaQueryEntries(storage);
	const taxonomyEntries = collectTaxonomyQueryEntries(storage);

	const queryEntries = [
		{ key: 'post_type', value: variable('post_type') },
		{
			key: 'post_status',
			value: statuses.length > 0 ? variable('statuses') : 'any',
		},
		{ key: 'fields', value: 'ids' },
		{
			key: 'paged',
			value: createPageExpression({ requestVariable: '$request' }),
		},
		{ key: 'posts_per_page', value: variable('per_page') },
	];

	const queryArgsAssignment = createQueryArgsAssignmentStatement({
		targetVariable: 'query_args',
		entries: queryEntries,
	});
	statements.push(queryArgsAssignment, buildStmtNop());

	appendSection(
		statements,
		buildMetaQueryStatements({ entries: metaEntries })
	);
	appendSection(
		statements,
		buildTaxonomyQueryStatements({ entries: taxonomyEntries })
	);

	statements.push(
		createWpQueryExecutionStatement({
			target: 'query',
			argsVariable: 'query_args',
			cache: {
				host: options.metadataHost,
				scope: 'list',
				operation: 'read',
				segments: options.cacheSegments,
				description: 'List query',
			},
		})
	);
	statements.push(buildStmtNop());

	statements.push(buildListItemsInitialiserStatement());
	statements.push(buildStmtNop());

	statements.push(
		buildListForeachStatement({ pascalName: options.pascalName })
	);
	statements.push(buildStmtNop());

	const totalFetch = buildScalarCast(
		'int',
		buildPropertyFetch('query', 'found_posts')
	);
	const pagesFetch = buildScalarCast(
		'int',
		buildPropertyFetch('query', 'max_num_pages')
	);

	statements.push(
		buildReturn(
			buildArray([
				buildArrayItem(buildVariable('items'), {
					key: buildScalarString('items'),
				}),
				buildArrayItem(totalFetch, {
					key: buildScalarString('total'),
				}),
				buildArrayItem(pagesFetch, {
					key: buildScalarString('pages'),
				}),
			])
		)
	);

	return statements;
}

function appendSection(target: PhpStmt[], section: readonly PhpStmt[]): void {
	if (section.length === 0) {
		return;
	}

	target.push(...section);

	const last = section[section.length - 1]!;
	if (last.nodeType !== 'Stmt_Nop') {
		target.push(buildStmtNop());
	}
}
