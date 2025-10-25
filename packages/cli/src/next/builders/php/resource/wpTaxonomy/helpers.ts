import { KernelError } from '@wpkernel/core/contracts';
import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildAssign,
	buildClassMethod,
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
	PHP_METHOD_MODIFIER_PRIVATE,
	type PhpExprMethodCall,
	type PhpNullableType,
	type PhpStmt,
	type PhpStmtClassMethod,
	type PhpStmtExpression,
} from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../ir/types';
import type { ResolvedIdentity } from '../../identity';
import {
	buildArrayDimFetch,
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
import { buildRequestParamAssignmentStatement } from '../request';

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

export interface TaxonomyHelperMethod {
	readonly node: PhpStmtClassMethod;
	readonly signature: string;
}

export function buildWpTaxonomyHelperMethods(
	options: TaxonomyHelperOptions
): TaxonomyHelperMethod[] {
	const storage = ensureStorage(options.resource);

	return [
		buildGetTaxonomyHelper(options.pascalName, storage),
		buildPrepareTermHelper(options.pascalName, storage),
		buildResolveTermHelper(options.pascalName),
		buildExtractTermArgsHelper(options.pascalName),
		buildValidateIdentityHelper(options),
	];
}

function buildGetTaxonomyHelper(
	pascalName: string,
	storage: WpTaxonomyStorage
): TaxonomyHelperMethod {
	const method = buildClassMethod(
		buildIdentifier(`get${pascalName}Taxonomy`),
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			returnType: buildIdentifier('string'),
			stmts: [buildReturn(buildScalarString(storage.taxonomy))],
		}
	);

	return {
		node: method,
		signature: `private function get${pascalName}Taxonomy(): string`,
	};
}

function buildPrepareTermHelper(
	pascalName: string,
	storage: WpTaxonomyStorage
): TaxonomyHelperMethod {
	const hierarchical = storage.hierarchical === true;

	const method = buildClassMethod(
		buildIdentifier(`prepare${pascalName}TermResponse`),
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [
				buildParam(buildVariable('term'), {
					type: buildName(['WP_Term']),
				}),
			],
			returnType: buildIdentifier('array'),
			stmts: [buildReturn(buildArrayTermResponse(hierarchical))],
		}
	);

	return {
		node: method,
		signature: `private function prepare${pascalName}TermResponse( WP_Term $term ): array`,
	};
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

function buildResolveTermHelper(pascalName: string): TaxonomyHelperMethod {
	const taxonomyVar = normaliseVariableReference('taxonomy');
	const identityVar = normaliseVariableReference('identity');
	const termVar = normaliseVariableReference('term');

	const statements: PhpStmt[] = [];

	statements.push(
		buildTaxonomyAssignmentStatement({
			pascalName,
			targetVariable: taxonomyVar.raw,
		})
	);

	const assignTermFromId = buildVariableAssignment(
		termVar,
		buildFuncCall(buildName(['get_term']), [
			buildArg(buildVariable(identityVar.raw)),
			buildArg(buildVariable(taxonomyVar.raw)),
		])
	);

	const returnTerm = buildReturn(buildVariable(termVar.raw));

	statements.push(
		buildIfStatementNode({
			condition: buildFuncCall(buildName(['is_int']), [
				buildArg(buildVariable(identityVar.raw)),
			]),
			statements: [
				assignTermFromId,
				buildIfStatementNode({
					condition: buildInstanceof(termVar.raw, 'WP_Term'),
					statements: [returnTerm],
				}),
			],
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildFuncCall(buildName(['is_string']), [
				buildArg(buildVariable(identityVar.raw)),
			]),
			statements: buildStringIdentityStatements(taxonomyVar, identityVar),
		})
	);

	statements.push(buildReturn(buildNull()));

	const method = buildClassMethod(
		buildIdentifier(`resolve${pascalName}Term`),
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [buildParam(buildVariable(identityVar.raw))],
			returnType: buildNode<PhpNullableType>('NullableType', {
				type: buildName(['WP_Term']),
			}),
			stmts: statements,
		}
	);

	return {
		node: method,
		signature: `private function resolve${pascalName}Term( $identity ): ?WP_Term`,
	};
}

function buildExtractTermArgsHelper(pascalName: string): TaxonomyHelperMethod {
	const requestVar = normaliseVariableReference('request');
	const argsVar = normaliseVariableReference('args');
	const descriptionVar = normaliseVariableReference('description');
	const slugVar = normaliseVariableReference('slug');
	const parentVar = normaliseVariableReference('parent');

	const statements: PhpStmt[] = [];

	statements.push(buildVariableAssignment(argsVar, buildArray([])));

	statements.push(
		buildRequestParamAssignmentStatement({
			requestVariable: requestVar.display,
			param: 'description',
			targetVariable: descriptionVar.display,
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildFuncCall(buildName(['is_string']), [
				buildArg(buildVariable(descriptionVar.raw)),
			]),
			statements: [
				buildExpressionStatement(
					buildAssign(
						buildArrayDimFetch(
							argsVar.raw,
							buildScalarString('description')
						),
						buildVariable(descriptionVar.raw)
					)
				),
			],
		})
	);

	statements.push(
		buildRequestParamAssignmentStatement({
			requestVariable: requestVar.display,
			param: 'slug',
			targetVariable: slugVar.display,
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildBinaryOperation(
				'BooleanAnd',
				buildFuncCall(buildName(['is_string']), [
					buildArg(buildVariable(slugVar.raw)),
				]),
				buildBinaryOperation(
					'NotIdentical',
					buildScalarString(''),
					buildFuncCall(buildName(['trim']), [
						buildArg(buildVariable(slugVar.raw)),
					])
				)
			),
			statements: [
				buildExpressionStatement(
					buildAssign(
						buildArrayDimFetch(
							argsVar.raw,
							buildScalarString('slug')
						),
						buildFuncCall(buildName(['sanitize_title']), [
							buildArg(buildVariable(slugVar.raw)),
						])
					)
				),
			],
		})
	);

	statements.push(
		buildRequestParamAssignmentStatement({
			requestVariable: requestVar.display,
			param: 'parent',
			targetVariable: parentVar.display,
		})
	);

	statements.push(
		buildIfStatementNode({
			condition: buildBinaryOperation(
				'NotIdentical',
				buildNull(),
				buildVariable(parentVar.raw)
			),
			statements: [
				buildExpressionStatement(
					buildAssign(
						buildArrayDimFetch(
							argsVar.raw,
							buildScalarString('parent')
						),
						buildFuncCall(buildName(['max']), [
							buildArg(buildScalarInt(0)),
							buildArg(
								buildScalarCast(
									'int',
									buildVariable(parentVar.raw)
								)
							),
						])
					)
				),
			],
		})
	);

	statements.push(buildReturn(buildVariable(argsVar.raw)));

	const method = buildClassMethod(
		buildIdentifier(`extract${pascalName}TermArgs`),
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [
				buildParam(buildVariable(requestVar.raw), {
					type: buildName(['WP_REST_Request']),
				}),
			],
			returnType: buildIdentifier('array'),
			stmts: statements,
		}
	);

	return {
		node: method,
		signature: `private function extract${pascalName}TermArgs( WP_REST_Request $request ): array`,
	};
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
				condition: buildInstanceof(termVar.raw, 'WP_Term'),
				statements: [slugReturn],
			}),
			nameLookup,
			buildIfStatementNode({
				condition: buildInstanceof(termVar.raw, 'WP_Term'),
				statements: [nameReturn],
			}),
		],
	});

	return [assignCandidate, nonEmptyGuard];
}

function buildValidateIdentityHelper(
	options: TaxonomyHelperOptions
): TaxonomyHelperMethod {
	const { pascalName, identity, errorCodeFactory } = options;
	const statements: PhpStmt[] = [];

	const missingReturn = buildWpErrorReturn({
		code: errorCodeFactory('missing_identifier'),
		message: `Missing identifier for ${pascalName}.`,
		status: 400,
	});

	statements.push(
		buildIfStatementNode({
			condition: buildBinaryOperation(
				'Identical',
				buildNull(),
				buildVariable('value')
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

		statements.push(
			buildIfStatementNode({
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

		statements.push(
			buildIfStatementNode({
				condition: buildBooleanNot(
					buildFuncCall(buildName(['is_numeric']), [
						buildArg(buildVariable('value')),
					])
				),
				statements: [invalidReturn],
			})
		);

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable('value'),
					buildScalarCast('int', buildVariable('value'))
				)
			)
		);

		statements.push(
			buildIfStatementNode({
				condition: buildBinaryOperation(
					'SmallerOrEqual',
					buildVariable('value'),
					buildScalarInt(0)
				),
				statements: [invalidReturn],
			})
		);

		statements.push(buildReturn(buildVariable('value')));
	} else {
		statements.push(
			buildIfStatementNode({
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

		statements.push(
			buildReturn(
				buildFuncCall(buildName(['trim']), [
					buildArg(buildScalarCast('string', buildVariable('value'))),
				])
			)
		);
	}

	const method = buildClassMethod(
		buildIdentifier(`validate${pascalName}Identity`),
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [buildParam(buildVariable('value'))],
			stmts: statements,
		}
	);

	return {
		node: method,
		signature: `private function validate${pascalName}Identity( $value )`,
	};
}

export interface TaxonomyAssignmentOptions {
	readonly pascalName: string;
	readonly targetVariable?: string;
}

export function buildTaxonomyAssignmentStatement(
	options: TaxonomyAssignmentOptions
): PhpStmtExpression {
	const { pascalName, targetVariable = 'taxonomy' } = options;
	const assignment = buildAssign(
		buildVariable(targetVariable),
		buildGetTaxonomyCall(pascalName)
	);

	return buildExpressionStatement(assignment);
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
