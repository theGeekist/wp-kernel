import { KernelError } from '@wpkernel/core/contracts';
import {
	buildArg,
	buildArray,
	buildArrayItem,
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
	type PhpExprMethodCall,
	type PhpMethodTemplate,
	type PhpNullableType,
	type PhpStmt,
	type PhpStmtExpression,
} from '@wpkernel/php-json-ast';
import {
	PHP_METHOD_MODIFIER_PRIVATE,
	assembleMethodTemplate,
} from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../ir/types';
import type { ResolvedIdentity } from '../../identity';
import {
	buildBinaryOperation,
	buildBooleanNot,
	buildIfStatementNode,
	buildInstanceof,
	buildPropertyFetch,
	buildScalarCast,
	buildVariableAssignment,
	normaliseVariableReference,
	type NormalisedVariableReference,
} from '../utils';
import { buildWpErrorReturn } from '../errors';

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
	return assembleMethodTemplate({
		signature: `private function get${pascalName}Taxonomy(): string`,
		indentLevel: 1,
		body: (body) => {
			body.statementNode(
				buildReturn(buildScalarString(storage.taxonomy))
			);
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
	const hierarchical = storage.hierarchical === true;

	return assembleMethodTemplate({
		signature: `private function prepare${pascalName}TermResponse( WP_Term $term ): array`,
		indentLevel: 1,
		body: (body) => {
			body.statementNode(
				buildReturn(buildArrayTermResponse(hierarchical))
			);
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
	const identityVar = normaliseVariableReference('identity');
	const taxonomyVar = normaliseVariableReference('taxonomy');

	return assembleMethodTemplate({
		signature: `private function resolve${pascalName}Term( $identity ): ?WP_Term`,
		indentLevel: 1,
		body: (body) => {
			body.statementNode(
				createTaxonomyAssignmentStatement({
					pascalName,
					targetVariable: taxonomyVar.display,
				})
			);

			body.statementNode(
				buildIfStatementNode({
					condition: buildFuncCall(buildName(['is_int']), [
						buildArg(buildVariable(identityVar.raw)),
					]),
					statements: [
						buildVariableAssignment(
							normaliseVariableReference('term'),
							buildFuncCall(buildName(['get_term']), [
								buildArg(buildVariable(identityVar.raw)),
								buildArg(buildVariable(taxonomyVar.raw)),
							])
						),
						buildIfStatementNode({
							condition: buildInstanceof('term', 'WP_Term'),
							statements: [buildReturn(buildVariable('term'))],
						}),
					],
				})
			);

			body.statementNode(
				buildIfStatementNode({
					condition: buildFuncCall(buildName(['is_string']), [
						buildArg(buildVariable(identityVar.raw)),
					]),
					statements: buildStringIdentityStatements(
						taxonomyVar,
						identityVar
					),
				})
			);

			body.statementNode(buildReturn(buildNull()));
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [buildParam(buildVariable(identityVar.raw))],
			returnType: buildNode<PhpNullableType>('NullableType', {
				type: buildName(['WP_Term']),
			}),
		},
	});
}

function buildStringIdentityStatements(
	taxonomyVar: NormalisedVariableReference,
	identityVar: NormalisedVariableReference
): PhpStmt[] {
	const candidateVar = normaliseVariableReference('candidate');
	const termVar = normaliseVariableReference('term');

	const assignCandidate = buildVariableAssignment(
		candidateVar,
		buildFuncCall(buildName(['trim']), [
			buildArg(
				buildFuncCall(buildName(['strval']), [
					buildArg(buildVariable(identityVar.raw)),
				])
			),
		])
	);

	const slugLookup = buildVariableAssignment(
		termVar,
		buildFuncCall(buildName(['get_term_by']), [
			buildArg(buildScalarString('slug')),
			buildArg(buildVariable(candidateVar.raw)),
			buildArg(buildVariable(taxonomyVar.raw)),
		])
	);

	const slugReturn = buildReturn(buildVariable(termVar.raw));

	const nameLookup = buildVariableAssignment(
		termVar,
		buildFuncCall(buildName(['get_term_by']), [
			buildArg(buildScalarString('name')),
			buildArg(buildVariable(candidateVar.raw)),
			buildArg(buildVariable(taxonomyVar.raw)),
		])
	);

	const nameReturn = buildReturn(buildVariable(termVar.raw));

	const nonEmptyGuard = buildIfStatementNode({
		condition: buildBinaryOperation(
			'NotIdentical',
			buildScalarString(''),
			buildVariable(candidateVar.raw)
		),
		statements: [
			slugLookup,
			buildIfStatementNode({
				condition: buildInstanceof('term', 'WP_Term'),
				statements: [slugReturn],
			}),
			nameLookup,
			buildIfStatementNode({
				condition: buildInstanceof('term', 'WP_Term'),
				statements: [nameReturn],
			}),
		],
	});

	return [assignCandidate, nonEmptyGuard];
}

function createValidateIdentityHelper(
	options: TaxonomyHelperOptions
): PhpMethodTemplate {
	const { pascalName, identity, errorCodeFactory } = options;
	const valueVar = normaliseVariableReference('value');

	return assembleMethodTemplate({
		signature: `private function validate${pascalName}Identity( $value )`,
		indentLevel: 1,
		body: (body) => {
			const missingReturn = buildWpErrorReturn({
				code: errorCodeFactory('missing_identifier'),
				message: `Missing identifier for ${pascalName}.`,
				status: 400,
			});

			body.statementNode(
				buildIfStatementNode({
					condition: buildBinaryOperation(
						'Identical',
						buildNull(),
						buildVariable(valueVar.raw)
					),
					statements: [missingReturn],
				})
			);

			if (identity.type === 'number') {
				const invalidReturn = buildWpErrorReturn({
					code: errorCodeFactory('invalid_identifier'),
					message: `Invalid identifier for ${pascalName}.`,
					status: 400,
				});

				body.statementNode(
					buildIfStatementNode({
						condition: buildBinaryOperation(
							'BooleanAnd',
							buildFuncCall(buildName(['is_string']), [
								buildArg(buildVariable(valueVar.raw)),
							]),
							buildBinaryOperation(
								'Identical',
								buildScalarString(''),
								buildFuncCall(buildName(['trim']), [
									buildArg(buildVariable(valueVar.raw)),
								])
							)
						),
						statements: [missingReturn],
					})
				);

				body.statementNode(
					buildIfStatementNode({
						condition: buildBooleanNot(
							buildFuncCall(buildName(['is_numeric']), [
								buildArg(buildVariable(valueVar.raw)),
							])
						),
						statements: [invalidReturn],
					})
				);

				body.statementNode(
					buildVariableAssignment(
						valueVar,
						buildScalarCast('int', buildVariable(valueVar.raw))
					)
				);

				body.statementNode(
					buildIfStatementNode({
						condition: buildBinaryOperation(
							'SmallerOrEqual',
							buildVariable(valueVar.raw),
							buildScalarInt(0)
						),
						statements: [invalidReturn],
					})
				);

				body.statementNode(buildReturn(buildVariable(valueVar.raw)));
				return;
			}

			body.statementNode(
				buildIfStatementNode({
					condition: buildBinaryOperation(
						'BooleanOr',
						buildBooleanNot(
							buildFuncCall(buildName(['is_string']), [
								buildArg(buildVariable(valueVar.raw)),
							])
						),
						buildBinaryOperation(
							'Identical',
							buildScalarString(''),
							buildFuncCall(buildName(['trim']), [
								buildArg(buildVariable(valueVar.raw)),
							])
						)
					),
					statements: [missingReturn],
				})
			);

			body.statementNode(
				buildReturn(
					buildFuncCall(buildName(['trim']), [
						buildArg(
							buildScalarCast(
								'string',
								buildVariable(valueVar.raw)
							)
						),
					])
				)
			);
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [buildParam(buildVariable(valueVar.raw))],
		},
	});
}

export interface TaxonomyAssignmentOptions {
	readonly pascalName: string;
	readonly targetVariable?: string;
}

export function createTaxonomyAssignmentStatement(
	options: TaxonomyAssignmentOptions
): PhpStmtExpression {
	const { pascalName, targetVariable = 'taxonomy' } = options;
	const target = normaliseVariableReference(targetVariable);

	return buildVariableAssignment(target, buildGetTaxonomyCall(pascalName));
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
