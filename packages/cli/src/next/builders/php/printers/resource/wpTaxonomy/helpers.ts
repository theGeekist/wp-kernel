import { KernelError } from '@wpkernel/core/contracts';
import {
	createArg,
	createArray,
	createArrayItem,
	createAssign,
	createExpressionStatement,
	createFuncCall,
	createIdentifier,
	createMethodCall,
	createName,
	createNode,
	createParam,
	createReturn,
	createScalarBool,
	createScalarInt,
	createScalarString,
	createVariable,
	createNull,
	type PhpNullableType,
} from '@wpkernel/php-json-ast/nodes';
import { createPrintable, escapeSingleQuotes } from '@wpkernel/php-json-ast';
import {
	createMethodTemplate,
	PHP_INDENT,
	type PhpMethodTemplate,
} from '@wpkernel/php-json-ast/templates';
import { PHP_METHOD_MODIFIER_PRIVATE } from '@wpkernel/php-json-ast/modifiers';
import type { IRResource } from '../../../../../../ir/types';
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

	return createMethodTemplate({
		signature: `private function get${pascalName}Taxonomy(): string`,
		indentLevel,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const returnPrintable = createPrintable(
				createReturn(createScalarString(storage.taxonomy)),
				[`${indent}return '${taxonomy}';`]
			);
			body.statement(returnPrintable);
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			returnType: createIdentifier('string'),
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

	return createMethodTemplate({
		signature: `private function prepare${pascalName}TermResponse( WP_Term $term ): array`,
		indentLevel,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const responseArray = createReturn(
				createArrayTermResponse(hierarchical)
			);
			const printable = createPrintable(responseArray, [
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
				createParam(createVariable('term'), {
					type: createName(['WP_Term']),
				}),
			],
			returnType: createIdentifier('array'),
		},
	});
}

function createArrayTermResponse(
	hierarchical: boolean
): ReturnType<typeof createArray> {
	return createArray([
		createArrayItem(
			buildScalarCast('int', buildPropertyFetch('term', 'term_id')),
			{
				key: createScalarString('id'),
			}
		),
		createArrayItem(
			buildScalarCast('string', buildPropertyFetch('term', 'slug')),
			{
				key: createScalarString('slug'),
			}
		),
		createArrayItem(
			buildScalarCast('string', buildPropertyFetch('term', 'name')),
			{
				key: createScalarString('name'),
			}
		),
		createArrayItem(
			buildScalarCast('string', buildPropertyFetch('term', 'taxonomy')),
			{ key: createScalarString('taxonomy') }
		),
		createArrayItem(createScalarBool(hierarchical), {
			key: createScalarString('hierarchical'),
		}),
		createArrayItem(
			buildScalarCast(
				'string',
				buildPropertyFetch('term', 'description')
			),
			{ key: createScalarString('description') }
		),
		createArrayItem(
			buildScalarCast('int', buildPropertyFetch('term', 'parent')),
			{
				key: createScalarString('parent'),
			}
		),
		createArrayItem(
			buildScalarCast('int', buildPropertyFetch('term', 'count')),
			{
				key: createScalarString('count'),
			}
		),
	]);
}

function createResolveTermHelper(pascalName: string): PhpMethodTemplate {
	const indentLevel = 1;
	const indent = PHP_INDENT.repeat(indentLevel);
	const childIndent = PHP_INDENT.repeat(indentLevel + 1);

	return createMethodTemplate({
		signature: `private function resolve${pascalName}Term( $identity ): ?WP_Term`,
		indentLevel,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const taxonomyAssign = createPrintable(
				createExpressionStatement(
					createAssign(
						createVariable('taxonomy'),
						createMethodCall(
							createVariable('this'),
							createIdentifier(`get${pascalName}Taxonomy`),
							[]
						)
					)
				),
				[`${childIndent}$taxonomy = $this->get${pascalName}Taxonomy();`]
			);
			body.statement(taxonomyAssign);

			const numberGuard = buildIfPrintable({
				indentLevel,
				condition: createFuncCall(createName(['is_int']), [
					createArg(createVariable('identity')),
				]),
				conditionText: `${indent}if ( is_int( $identity ) ) {`,
				statements: [
					createPrintable(
						createExpressionStatement(
							createAssign(
								createVariable('term'),
								createFuncCall(createName(['get_term']), [
									createArg(createVariable('identity')),
									createArg(createVariable('taxonomy')),
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
						conditionText: `${childIndent}if ( $term instanceof WP_Term ) {`,
						statements: [
							createPrintable(
								createReturn(createVariable('term')),
								[`${childIndent}${PHP_INDENT}return $term;`]
							),
						],
					}),
				],
			});
			body.statement(numberGuard);

			const candidateAssign = createPrintable(
				createExpressionStatement(
					createAssign(
						createVariable('candidate'),
						createFuncCall(createName(['trim']), [
							createArg(
								createFuncCall(createName(['strval']), [
									createArg(createVariable('identity')),
								])
							),
						])
					)
				),
				[`${childIndent}$candidate = trim( (string) $identity );`]
			);

			const lookupIndent = PHP_INDENT.repeat(indentLevel + 2);
			const slugLookup = createPrintable(
				createExpressionStatement(
					createAssign(
						createVariable('term'),
						createFuncCall(createName(['get_term_by']), [
							createArg(createScalarString('slug')),
							createArg(createVariable('candidate')),
							createArg(createVariable('taxonomy')),
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
				conditionText: `${lookupIndent}if ( $term instanceof WP_Term ) {`,
				statements: [
					createPrintable(createReturn(createVariable('term')), [
						`${lookupIndent}${PHP_INDENT}return $term;`,
					]),
				],
			});

			const nameLookup = createPrintable(
				createExpressionStatement(
					createAssign(
						createVariable('term'),
						createFuncCall(createName(['get_term_by']), [
							createArg(createScalarString('name')),
							createArg(createVariable('candidate')),
							createArg(createVariable('taxonomy')),
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
				conditionText: `${lookupIndent}if ( $term instanceof WP_Term ) {`,
				statements: [
					createPrintable(createReturn(createVariable('term')), [
						`${lookupIndent}${PHP_INDENT}return $term;`,
					]),
				],
			});

			const nonEmptyGuard = buildIfPrintable({
				indentLevel: indentLevel + 1,
				condition: buildBinaryOperation(
					'NotIdentical',
					createScalarString(''),
					createVariable('candidate')
				),
				conditionText: `${childIndent}if ( '' !== $candidate ) {`,
				statements: [slugLookup, slugGuard, nameLookup, nameGuard],
			});

			const stringGuard = buildIfPrintable({
				indentLevel,
				condition: createFuncCall(createName(['is_string']), [
					createArg(createVariable('identity')),
				]),
				conditionText: `${indent}if ( is_string( $identity ) ) {`,
				statements: [candidateAssign, nonEmptyGuard],
			});
			body.statement(stringGuard);

			body.statement(
				createPrintable(createReturn(createNull()), [
					`${childIndent}return null;`,
				])
			);
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [createParam(createVariable('identity'))],
			returnType: createNode<PhpNullableType>('NullableType', {
				type: createName(['WP_Term']),
			}),
		},
	});
}

function createValidateIdentityHelper(
	options: TaxonomyHelperOptions
): PhpMethodTemplate {
	const { pascalName, identity, errorCodeFactory } = options;
	const indentLevel = 1;
	const indent = PHP_INDENT.repeat(indentLevel);
	const childIndent = PHP_INDENT.repeat(indentLevel + 1);

	return createMethodTemplate({
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
						createNull(),
						createVariable('value')
					),
					conditionText: `${indent}if ( null === $value ) {`,
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
							createFuncCall(createName(['is_string']), [
								createArg(createVariable('value')),
							]),
							buildBinaryOperation(
								'Identical',
								createScalarString(''),
								createFuncCall(createName(['trim']), [
									createArg(createVariable('value')),
								])
							)
						),
						conditionText: `${indent}if ( is_string( $value ) && '' === trim( $value ) ) {`,
						statements: [missingReturn],
					})
				);

				body.statement(
					buildIfPrintable({
						indentLevel,
						condition: buildBooleanNot(
							createFuncCall(createName(['is_numeric']), [
								createArg(createVariable('value')),
							])
						),
						conditionText: `${indent}if ( ! is_numeric( $value ) ) {`,
						statements: [invalidReturn],
					})
				);

				body.statement(
					createPrintable(
						createExpressionStatement(
							createAssign(
								createVariable('value'),
								buildScalarCast('int', createVariable('value'))
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
							createVariable('value'),
							createScalarInt(0)
						),
						conditionText: `${indent}if ( $value <= 0 ) {`,
						statements: [invalidReturn],
					})
				);

				body.statement(
					createPrintable(createReturn(createVariable('value')), [
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
							createFuncCall(createName(['is_string']), [
								createArg(createVariable('value')),
							])
						),
						buildBinaryOperation(
							'Identical',
							createScalarString(''),
							createFuncCall(createName(['trim']), [
								createArg(createVariable('value')),
							])
						)
					),
					conditionText: `${indent}if ( ! is_string( $value ) || '' === trim( $value ) ) {`,
					statements: [missingReturn],
				})
			);

			body.statement(
				createPrintable(
					createReturn(
						createFuncCall(createName(['trim']), [
							createArg(
								buildScalarCast(
									'string',
									createVariable('value')
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
			params: [createParam(createVariable('value'))],
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
