import {
	createArray,
	createArrayItem,
	createAssign,
	createExpressionStatement,
	createMethodCall,
	createReturn,
	createScalarString,
	createVariable,
	createIdentifier,
	createPrintable,
	isNonEmptyString,
} from '@wpkernel/php-json-ast';
import {
	PHP_INDENT,
	type PhpMethodBodyBuilder,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import {
	appendMetaQueryBuilder,
	appendTaxonomyQueryBuilder,
	collectMetaQueryEntries,
	collectTaxonomyQueryEntries,
	createListForeachPrintable,
	createListItemsInitialiser,
	createPageExpression,
	createPaginationNormalisation,
	buildPropertyFetch,
	createQueryArgsAssignment,
	buildScalarCast,
	createWpQueryExecution,
	variable,
	buildWpTaxonomyListRouteBody,
} from '../../resource';
import type { IRResource } from '../../../../../ir/types';

export interface BuildListRouteBodyOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildListRouteBody(
	options: BuildListRouteBodyOptions
): boolean {
	const storage = options.resource.storage;
	if (!storage) {
		return false;
	}

	if (storage.mode === 'wp-taxonomy') {
		return buildWpTaxonomyListRouteBody({
			body: options.body,
			indentLevel: options.indentLevel,
			resource: options.resource,
			pascalName: options.pascalName,
			metadataHost: options.metadataHost,
			cacheSegments: options.cacheSegments,
		});
	}

	if (storage.mode !== 'wp-post') {
		return false;
	}

	const indentLevel = options.indentLevel;
	const indent = PHP_INDENT.repeat(indentLevel);

	const postTypePrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('post_type'),
				createMethodCall(
					createVariable('this'),
					createIdentifier(`get${options.pascalName}PostType`),
					[]
				)
			)
		),
		[`${indent}$post_type = $this->get${options.pascalName}PostType();`]
	);
	options.body.statement(postTypePrintable);

	const [perPageAssign, ensurePositive, clampMaximum] =
		createPaginationNormalisation({
			requestVariable: '$request',
			targetVariable: 'per_page',
			indentLevel,
		});
	options.body.statement(perPageAssign);
	options.body.statement(ensurePositive);
	options.body.statement(clampMaximum);
	options.body.blank();

	const statuses = Array.isArray(storage.statuses)
		? storage.statuses.filter(isNonEmptyString)
		: [];

	if (statuses.length > 0) {
		const statusesPrintable = createPrintable(
			createExpressionStatement(
				createAssign(
					createVariable('statuses'),
					createMethodCall(
						createVariable('this'),
						createIdentifier(`get${options.pascalName}Statuses`),
						[]
					)
				)
			),
			[`${indent}$statuses = $this->get${options.pascalName}Statuses();`]
		);
		options.body.statement(statusesPrintable);
		options.body.blank();
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
	] as const;

	options.body.statement(
		createQueryArgsAssignment({
			targetVariable: 'query_args',
			entries: queryEntries,
			indentLevel,
		})
	);
	options.body.blank();

	appendMetaQueryBuilder({
		body: options.body,
		indentLevel,
		entries: metaEntries,
	});

	appendTaxonomyQueryBuilder({
		body: options.body,
		indentLevel,
		entries: taxonomyEntries,
	});

	options.body.statement(
		createWpQueryExecution({
			target: 'query',
			argsVariable: 'query_args',
			indentLevel,
			cache: {
				host: options.metadataHost,
				scope: 'list',
				operation: 'read',
				segments: options.cacheSegments,
				description: 'List query',
			},
		})
	);

	const itemsPrintable = createListItemsInitialiser({
		indentLevel,
	});
	options.body.statement(itemsPrintable);
	options.body.blank();

	const foreachPrintable = createListForeachPrintable({
		pascalName: options.pascalName,
		indentLevel,
	});
	options.body.statement(foreachPrintable);
	options.body.blank();

	const totalFetch = buildScalarCast(
		'int',
		buildPropertyFetch('query', 'found_posts')
	);
	const pagesFetch = buildScalarCast(
		'int',
		buildPropertyFetch('query', 'max_num_pages')
	);

	const returnPrintable = createPrintable(
		createReturn(
			createArray([
				createArrayItem(createVariable('items'), {
					key: createScalarString('items'),
				}),
				createArrayItem(totalFetch, {
					key: createScalarString('total'),
				}),
				createArrayItem(pagesFetch, {
					key: createScalarString('pages'),
				}),
			])
		),
		[
			`${indent}return array(`,
			`${indent}${PHP_INDENT}'items' => $items,`,
			`${indent}${PHP_INDENT}'total' => (int) $query->found_posts,`,
			`${indent}${PHP_INDENT}'pages' => (int) $query->max_num_pages,`,
			`${indent});`,
		]
	);
	options.body.statement(returnPrintable);

	return true;
}
