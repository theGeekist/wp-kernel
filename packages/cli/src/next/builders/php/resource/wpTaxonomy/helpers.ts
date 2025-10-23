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
	type PhpExpr,
	type PhpStmtExpression,
	type PhpStmtReturn,
	type PhpExprMethodCall,
	type PhpPrintable,
} from '@wpkernel/php-json-ast';
import { PHP_METHOD_MODIFIER_PRIVATE } from '@wpkernel/php-json-ast';
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
import { formatStatementPrintable } from '../printer';

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
	const indentLevel = 1;
	const statementIndent = indentLevel + 1;

	return assembleMethodTemplate({
		signature: `private function get${pascalName}Taxonomy(): string`,
		indentLevel,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const returnPrintable = createReturnPrintable(
				buildScalarString(storage.taxonomy),
				statementIndent
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
	const statementIndent = indentLevel + 1;
	const hierarchical = storage.hierarchical === true;

	return assembleMethodTemplate({
		signature: `private function prepare${pascalName}TermResponse( WP_Term $term ): array`,
		indentLevel,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const responseReturn = createReturnPrintable(
				buildArrayTermResponse(hierarchical),
				statementIndent
			);
			body.statement(responseReturn);
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
	const statementIndent = indentLevel + 1;

	return assembleMethodTemplate({
		signature: `private function resolve${pascalName}Term( $identity ): ?WP_Term`,
		indentLevel,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const taxonomyAssign = createTaxonomyAssignmentPrintable({
				pascalName,
				indentLevel: statementIndent,
				targetVariable: 'taxonomy',
			});
			body.statement(taxonomyAssign);

			const termAssign = createExpressionPrintable(
				buildAssign(
					buildVariable('term'),
					buildFuncCall(buildName(['get_term']), [
						buildArg(buildVariable('identity')),
						buildArg(buildVariable('taxonomy')),
					])
				),
				statementIndent + 1
			);

			const termReturn = createReturnPrintable(
				buildVariable('term'),
				statementIndent + 2
			);

			const numberGuard = buildIfPrintable({
				indentLevel: statementIndent,
				condition: buildFuncCall(buildName(['is_int']), [
					buildArg(buildVariable('identity')),
				]),
				statements: [
					termAssign,
					buildIfPrintable({
						indentLevel: statementIndent + 1,
						condition: buildInstanceof('term', 'WP_Term'),
						statements: [termReturn],
					}),
				],
			});
			body.statement(numberGuard);

			const candidateAssign = createExpressionPrintable(
				buildAssign(
					buildVariable('candidate'),
					buildFuncCall(buildName(['trim']), [
						buildArg(
							buildFuncCall(buildName(['strval']), [
								buildArg(buildVariable('identity')),
							])
						),
					])
				),
				statementIndent + 1
			);

			const slugLookup = createExpressionPrintable(
				buildAssign(
					buildVariable('term'),
					buildFuncCall(buildName(['get_term_by']), [
						buildArg(buildScalarString('slug')),
						buildArg(buildVariable('candidate')),
						buildArg(buildVariable('taxonomy')),
					])
				),
				statementIndent + 2
			);

			const slugReturn = createReturnPrintable(
				buildVariable('term'),
				statementIndent + 3
			);

			const slugGuard = buildIfPrintable({
				indentLevel: statementIndent + 2,
				condition: buildInstanceof('term', 'WP_Term'),
				statements: [slugReturn],
			});

			const nameLookup = createExpressionPrintable(
				buildAssign(
					buildVariable('term'),
					buildFuncCall(buildName(['get_term_by']), [
						buildArg(buildScalarString('name')),
						buildArg(buildVariable('candidate')),
						buildArg(buildVariable('taxonomy')),
					])
				),
				statementIndent + 2
			);

			const nameReturn = createReturnPrintable(
				buildVariable('term'),
				statementIndent + 3
			);

			const nameGuard = buildIfPrintable({
				indentLevel: statementIndent + 2,
				condition: buildInstanceof('term', 'WP_Term'),
				statements: [nameReturn],
			});

			const nonEmptyGuard = buildIfPrintable({
				indentLevel: statementIndent + 1,
				condition: buildBinaryOperation(
					'NotIdentical',
					buildScalarString(''),
					buildVariable('candidate')
				),
				statements: [slugLookup, slugGuard, nameLookup, nameGuard],
			});

			const stringGuard = buildIfPrintable({
				indentLevel: statementIndent,
				condition: buildFuncCall(buildName(['is_string']), [
					buildArg(buildVariable('identity')),
				]),
				statements: [candidateAssign, nonEmptyGuard],
			});
			body.statement(stringGuard);

			const nullReturn = createReturnPrintable(
				buildNull(),
				statementIndent
			);
			body.statement(nullReturn);
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
	const statementIndent = indentLevel + 1;

	return assembleMethodTemplate({
		signature: `private function validate${pascalName}Identity( $value )`,
		indentLevel,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const missingReturn = createWpErrorReturn({
				indentLevel: statementIndent + 1,
				code: errorCodeFactory('missing_identifier'),
				message: `Missing identifier for ${pascalName}.`,
				status: 400,
			});

			body.statement(
				buildIfPrintable({
					indentLevel: statementIndent,
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
					indentLevel: statementIndent + 1,
					code: errorCodeFactory('invalid_identifier'),
					message: `Invalid identifier for ${pascalName}.`,
					status: 400,
				});

				body.statement(
					buildIfPrintable({
						indentLevel: statementIndent,
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
						indentLevel: statementIndent,
						condition: buildBooleanNot(
							buildFuncCall(buildName(['is_numeric']), [
								buildArg(buildVariable('value')),
							])
						),
						statements: [invalidReturn],
					})
				);

				body.statement(
					createExpressionPrintable(
						buildAssign(
							buildVariable('value'),
							buildScalarCast('int', buildVariable('value'))
						),
						statementIndent
					)
				);

				body.statement(
					buildIfPrintable({
						indentLevel: statementIndent,
						condition: buildBinaryOperation(
							'SmallerOrEqual',
							buildVariable('value'),
							buildScalarInt(0)
						),
						statements: [invalidReturn],
					})
				);

				body.statement(
					createReturnPrintable(
						buildVariable('value'),
						statementIndent
					)
				);
				return;
			}

			body.statement(
				buildIfPrintable({
					indentLevel: statementIndent,
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
				createReturnPrintable(
					buildFuncCall(buildName(['trim']), [
						buildArg(
							buildScalarCast('string', buildVariable('value'))
						),
					]),
					statementIndent
				)
			);
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [buildParam(buildVariable('value'))],
		},
	});
}

export interface TaxonomyAssignmentPrintableOptions {
	readonly pascalName: string;
	readonly indentLevel: number;
	readonly targetVariable?: string;
}

export function createTaxonomyAssignmentPrintable(
	options: TaxonomyAssignmentPrintableOptions
): PhpPrintable<PhpStmtExpression> {
	const { pascalName, indentLevel, targetVariable = 'taxonomy' } = options;
	const assignment = buildAssign(
		buildVariable(targetVariable),
		buildGetTaxonomyCall(pascalName)
	);

	return createExpressionPrintable(assignment, indentLevel);
}

export function buildGetTaxonomyCall(pascalName: string): PhpExprMethodCall {
	return buildMethodCall(
		buildVariable('this'),
		buildIdentifier(`get${pascalName}Taxonomy`),
		[]
	);
}

export function buildResolveTaxonomyTermCall(
	pascalName: string,
	identityVariable = 'identity'
): PhpExprMethodCall {
	return buildMethodCall(
		buildVariable('this'),
		buildIdentifier(`resolve${pascalName}Term`),
		[buildArg(buildVariable(identityVariable))]
	);
}

export function buildPrepareTaxonomyTermResponseCall(
	pascalName: string,
	termVariable = 'term'
): PhpExprMethodCall {
	return buildMethodCall(
		buildVariable('this'),
		buildIdentifier(`prepare${pascalName}TermResponse`),
		[buildArg(buildVariable(termVariable))]
	);
}

function createExpressionPrintable(
	expression: PhpExpr,
	indentLevel: number
): PhpPrintable<PhpStmtExpression> {
	const statement = buildExpressionStatement(expression);
	return formatStatementPrintable(statement, {
		indentLevel,
		indentUnit: PHP_INDENT,
	});
}

function createReturnPrintable(
	expression: PhpExpr | null,
	indentLevel: number
): PhpPrintable<PhpStmtReturn> {
	const statement = buildReturn(expression);
	return formatStatementPrintable(statement, {
		indentLevel,
		indentUnit: PHP_INDENT,
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
