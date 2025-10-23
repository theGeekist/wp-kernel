import { KernelError } from '@wpkernel/core/contracts';
import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildNode,
	buildParam,
	buildReturn,
	buildScalarBool,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	buildNull,
	type PhpNullableType,
	assembleMethodTemplate,
	PHP_INDENT,
	type PhpMethodTemplate,
} from '@wpkernel/php-json-ast';
import {
	buildPrintable,
	PHP_METHOD_MODIFIER_PRIVATE,
	escapeSingleQuotes,
} from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../ir/types';
import type { ResolvedIdentity } from '../../identity';
import {
	buildBinaryOperation,
	buildBooleanNot,
	buildIfPrintable,
	buildInstanceof,
	buildPropertyFetch,
	buildScalarCast,
} from '../utils';
import { createWpErrorReturn } from '../errors';

type WpTaxonomyStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-taxonomy' }
>;

export interface TaxonomyHelperOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly identity: ResolvedIdentity;
	readonly errorCodeFactory: (suffix: string) => string;
}

export function createWpTaxonomyHelperMethods(
	options: TaxonomyHelperOptions
): PhpMethodTemplate[] {
	const storage = ensureStorage(options.resource);

	return [
		createGetTaxonomyHelper(options.pascalName, storage),
		createPrepareTermHelper(options.pascalName, storage),
		createResolveTermHelper(options.pascalName),
		createValidateIdentityHelper(options),
	];
}

function createGetTaxonomyHelper(
	pascalName: string,
	storage: WpTaxonomyStorage
): PhpMethodTemplate {
	const taxonomy = escapeSingleQuotes(storage.taxonomy);
	const indentLevel = 1;
	const indent = PHP_INDENT.repeat(indentLevel + 1);

	return assembleMethodTemplate({
		signature: `private function get${pascalName}Taxonomy(): string`,
		indentLevel,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const returnPrintable = buildPrintable(
				buildReturn(buildScalarString(storage.taxonomy)),
				[`${indent}return '${taxonomy}';`]
			);
			body.statement(returnPrintable);
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			returnType: buildIdentifier('string'),
		},
	});
}

function createPrepareTermHelper(
	pascalName: string,
	storage: WpTaxonomyStorage
): PhpMethodTemplate {
	const indentLevel = 1;
	const indent = PHP_INDENT.repeat(indentLevel + 1);
	const hierarchical = storage.hierarchical === true;

	return assembleMethodTemplate({
		signature: `private function prepare${pascalName}TermResponse( WP_Term $term ): array`,
		indentLevel,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const responseArray = buildReturn(
				buildArrayTermResponse(hierarchical)
			);
			const printable = buildPrintable(responseArray, [
				`${indent}return array(`,
				`${indent}${PHP_INDENT}'id' => (int) $term->term_id,`,
				`${indent}${PHP_INDENT}'slug' => (string) $term->slug,`,
				`${indent}${PHP_INDENT}'name' => (string) $term->name,`,
				`${indent}${PHP_INDENT}'taxonomy' => (string) $term->taxonomy,`,
				`${indent}${PHP_INDENT}'hierarchical' => ${
					hierarchical ? 'true' : 'false'
				},`,
				`${indent}${PHP_INDENT}'description' => (string) $term->description,`,
				`${indent}${PHP_INDENT}'parent' => (int) $term->parent,`,
				`${indent}${PHP_INDENT}'count' => (int) $term->count,`,
				`${indent});`,
			]);
			body.statement(printable);
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [
				buildParam(buildVariable('term'), {
					type: buildName(['WP_Term']),
				}),
			],
			returnType: buildIdentifier('array'),
		},
	});
}

function buildArrayTermResponse(
	hierarchical: boolean
): ReturnType<typeof buildArray> {
	return buildArray([
		buildArrayItem(
			buildScalarCast('int', buildPropertyFetch('term', 'term_id')),
			{
				key: buildScalarString('id'),
			}
		),
		buildArrayItem(
			buildScalarCast('string', buildPropertyFetch('term', 'slug')),
			{
				key: buildScalarString('slug'),
			}
		),
		buildArrayItem(
			buildScalarCast('string', buildPropertyFetch('term', 'name')),
			{
				key: buildScalarString('name'),
			}
		),
		buildArrayItem(
			buildScalarCast('string', buildPropertyFetch('term', 'taxonomy')),
			{ key: buildScalarString('taxonomy') }
		),
		buildArrayItem(buildScalarBool(hierarchical), {
			key: buildScalarString('hierarchical'),
		}),
		buildArrayItem(
			buildScalarCast(
				'string',
				buildPropertyFetch('term', 'description')
			),
			{ key: buildScalarString('description') }
		),
		buildArrayItem(
			buildScalarCast('int', buildPropertyFetch('term', 'parent')),
			{
				key: buildScalarString('parent'),
			}
		),
		buildArrayItem(
			buildScalarCast('int', buildPropertyFetch('term', 'count')),
			{
				key: buildScalarString('count'),
			}
		),
	]);
}

function createResolveTermHelper(pascalName: string): PhpMethodTemplate {
	const indentLevel = 1;
	const childIndent = PHP_INDENT.repeat(indentLevel + 1);

	return assembleMethodTemplate({
		signature: `private function resolve${pascalName}Term( $identity ): ?WP_Term`,
		indentLevel,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const taxonomyAssign = buildPrintable(
				buildExpressionStatement(
					buildAssign(
						buildVariable('taxonomy'),
						buildMethodCall(
							buildVariable('this'),
							buildIdentifier(`get${pascalName}Taxonomy`),
							[]
						)
					)
				),
				[`${childIndent}$taxonomy = $this->get${pascalName}Taxonomy();`]
			);
			body.statement(taxonomyAssign);

			const numberGuard = buildIfPrintable({
				indentLevel,
				condition: buildFuncCall(buildName(['is_int']), [
					buildArg(buildVariable('identity')),
				]),
				statements: [
					buildPrintable(
						buildExpressionStatement(
							buildAssign(
								buildVariable('term'),
								buildFuncCall(buildName(['get_term']), [
									buildArg(buildVariable('identity')),
									buildArg(buildVariable('taxonomy')),
								])
							)
						),
						[
							`${childIndent}$term = get_term( $identity, $taxonomy );`,
						]
					),
					buildIfPrintable({
						indentLevel: indentLevel + 1,
						condition: buildInstanceof('term', 'WP_Term'),
						statements: [
							buildPrintable(buildReturn(buildVariable('term')), [
								`${childIndent}${PHP_INDENT}return $term;`,
							]),
						],
					}),
				],
			});
			body.statement(numberGuard);

			const candidateAssign = buildPrintable(
				buildExpressionStatement(
					buildAssign(
						buildVariable('candidate'),
						buildFuncCall(buildName(['trim']), [
							buildArg(
								buildFuncCall(buildName(['strval']), [
									buildArg(buildVariable('identity')),
								])
							),
						])
					)
				),
				[`${childIndent}$candidate = trim( (string) $identity );`]
			);

			const lookupIndent = PHP_INDENT.repeat(indentLevel + 2);
			const slugLookup = buildPrintable(
				buildExpressionStatement(
					buildAssign(
						buildVariable('term'),
						buildFuncCall(buildName(['get_term_by']), [
							buildArg(buildScalarString('slug')),
							buildArg(buildVariable('candidate')),
							buildArg(buildVariable('taxonomy')),
						])
					)
				),
				[
					`${lookupIndent}$term = get_term_by( 'slug', $candidate, $taxonomy );`,
				]
			);
			const slugGuard = buildIfPrintable({
				indentLevel: indentLevel + 2,
				condition: buildInstanceof('term', 'WP_Term'),
				statements: [
					buildPrintable(buildReturn(buildVariable('term')), [
						`${lookupIndent}${PHP_INDENT}return $term;`,
					]),
				],
			});

			const nameLookup = buildPrintable(
				buildExpressionStatement(
					buildAssign(
						buildVariable('term'),
						buildFuncCall(buildName(['get_term_by']), [
							buildArg(buildScalarString('name')),
							buildArg(buildVariable('candidate')),
							buildArg(buildVariable('taxonomy')),
						])
					)
				),
				[
					`${lookupIndent}$term = get_term_by( 'name', $candidate, $taxonomy );`,
				]
			);
			const nameGuard = buildIfPrintable({
				indentLevel: indentLevel + 2,
				condition: buildInstanceof('term', 'WP_Term'),
				statements: [
					buildPrintable(buildReturn(buildVariable('term')), [
						`${lookupIndent}${PHP_INDENT}return $term;`,
					]),
				],
			});

			const nonEmptyGuard = buildIfPrintable({
				indentLevel: indentLevel + 1,
				condition: buildBinaryOperation(
					'NotIdentical',
					buildScalarString(''),
					buildVariable('candidate')
				),
				statements: [slugLookup, slugGuard, nameLookup, nameGuard],
			});

			const stringGuard = buildIfPrintable({
				indentLevel,
				condition: buildFuncCall(buildName(['is_string']), [
					buildArg(buildVariable('identity')),
				]),
				statements: [candidateAssign, nonEmptyGuard],
			});
			body.statement(stringGuard);

			body.statement(
				buildPrintable(buildReturn(buildNull()), [
					`${childIndent}return null;`,
				])
			);
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [buildParam(buildVariable('identity'))],
			returnType: buildNode<PhpNullableType>('NullableType', {
				type: buildName(['WP_Term']),
			}),
		},
	});
}

function createValidateIdentityHelper(
	options: TaxonomyHelperOptions
): PhpMethodTemplate {
	const { pascalName, identity, errorCodeFactory } = options;
	const indentLevel = 1;
	const childIndent = PHP_INDENT.repeat(indentLevel + 1);

	return assembleMethodTemplate({
		signature: `private function validate${pascalName}Identity( $value )`,
		indentLevel,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const missingReturn = createWpErrorReturn({
				indentLevel: indentLevel + 1,
				code: errorCodeFactory('missing_identifier'),
				message: `Missing identifier for ${pascalName}.`,
				status: 400,
			});

			body.statement(
				buildIfPrintable({
					indentLevel,
					condition: buildBinaryOperation(
						'Identical',
						buildNull(),
						buildVariable('value')
					),
					statements: [missingReturn],
				})
			);

			if (identity.type === 'number') {
				const invalidReturn = createWpErrorReturn({
					indentLevel: indentLevel + 1,
					code: errorCodeFactory('invalid_identifier'),
					message: `Invalid identifier for ${pascalName}.`,
					status: 400,
				});

				body.statement(
					buildIfPrintable({
						indentLevel,
						condition: buildBinaryOperation(
							'BooleanAnd',
							buildFuncCall(buildName(['is_string']), [
								buildArg(buildVariable('value')),
							]),
							buildBinaryOperation(
								'Identical',
								buildScalarString(''),
								buildFuncCall(buildName(['trim']), [
									buildArg(buildVariable('value')),
								])
							)
						),
						statements: [missingReturn],
					})
				);

				body.statement(
					buildIfPrintable({
						indentLevel,
						condition: buildBooleanNot(
							buildFuncCall(buildName(['is_numeric']), [
								buildArg(buildVariable('value')),
							])
						),
						statements: [invalidReturn],
					})
				);

				body.statement(
					buildPrintable(
						buildExpressionStatement(
							buildAssign(
								buildVariable('value'),
								buildScalarCast('int', buildVariable('value'))
							)
						),
						[`${childIndent}$value = (int) $value;`]
					)
				);

				body.statement(
					buildIfPrintable({
						indentLevel,
						condition: buildBinaryOperation(
							'SmallerOrEqual',
							buildVariable('value'),
							buildScalarInt(0)
						),
						statements: [invalidReturn],
					})
				);

				body.statement(
					buildPrintable(buildReturn(buildVariable('value')), [
						`${childIndent}return $value;`,
					])
				);
				return;
			}

			body.statement(
				buildIfPrintable({
					indentLevel,
					condition: buildBinaryOperation(
						'BooleanOr',
						buildBooleanNot(
							buildFuncCall(buildName(['is_string']), [
								buildArg(buildVariable('value')),
							])
						),
						buildBinaryOperation(
							'Identical',
							buildScalarString(''),
							buildFuncCall(buildName(['trim']), [
								buildArg(buildVariable('value')),
							])
						)
					),
					statements: [missingReturn],
				})
			);

			body.statement(
				buildPrintable(
					buildReturn(
						buildFuncCall(buildName(['trim']), [
							buildArg(
								buildScalarCast(
									'string',
									buildVariable('value')
								)
							),
						])
					),
					[`${childIndent}return trim( (string) $value );`]
				)
			);
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [buildParam(buildVariable('value'))],
		},
	});
}

function ensureStorage(resource: IRResource): WpTaxonomyStorage {
	const storage = resource.storage;
	if (!storage || storage.mode !== 'wp-taxonomy') {
		throw new KernelError('DeveloperError', {
			message: 'Resource must use wp-taxonomy storage.',
			context: { name: resource.name },
		});
	}
	return storage;
}
