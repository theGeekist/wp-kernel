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
	buildBinaryOperation,
	buildBooleanNot,
	buildIfStatementNode,
	buildInstanceof,
	buildPropertyFetch,
	buildScalarCast,
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

export interface TaxonomyHelperMethod {
	readonly node: PhpStmtClassMethod;
	readonly signature: string;
}

export function createWpTaxonomyHelperMethods(
	options: TaxonomyHelperOptions
): TaxonomyHelperMethod[] {
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

function createPrepareTermHelper(
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

function createResolveTermHelper(pascalName: string): TaxonomyHelperMethod {
	const statements: PhpStmt[] = [];

	statements.push(
		buildTaxonomyAssignmentStatement({
			pascalName,
			targetVariable: 'taxonomy',
		})
	);

	const assignTermFromId = buildExpressionStatement(
		buildAssign(
			buildVariable('term'),
			buildFuncCall(buildName(['get_term']), [
				buildArg(buildVariable('identity')),
				buildArg(buildVariable('taxonomy')),
			])
		)
	);

	const returnTerm = buildReturn(buildVariable('term'));

	statements.push(
		buildIfStatementNode({
			condition: buildFuncCall(buildName(['is_int']), [
				buildArg(buildVariable('identity')),
			]),
			statements: [
				assignTermFromId,
				buildIfStatementNode({
					condition: buildInstanceof('term', 'WP_Term'),
					statements: [returnTerm],
				}),
			],
		})
	);

	const assignCandidate = buildExpressionStatement(
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
	);

	const lookupBySlug = buildExpressionStatement(
		buildAssign(
			buildVariable('term'),
			buildFuncCall(buildName(['get_term_by']), [
				buildArg(buildScalarString('slug')),
				buildArg(buildVariable('candidate')),
				buildArg(buildVariable('taxonomy')),
			])
		)
	);

	const slugGuard = buildIfStatementNode({
		condition: buildInstanceof('term', 'WP_Term'),
		statements: [returnTerm],
	});

	const lookupByName = buildExpressionStatement(
		buildAssign(
			buildVariable('term'),
			buildFuncCall(buildName(['get_term_by']), [
				buildArg(buildScalarString('name')),
				buildArg(buildVariable('candidate')),
				buildArg(buildVariable('taxonomy')),
			])
		)
	);

	const nameGuard = buildIfStatementNode({
		condition: buildInstanceof('term', 'WP_Term'),
		statements: [returnTerm],
	});

	const nonEmptyCandidateGuard = buildIfStatementNode({
		condition: buildBinaryOperation(
			'NotIdentical',
			buildScalarString(''),
			buildVariable('candidate')
		),
		statements: [lookupBySlug, slugGuard, lookupByName, nameGuard],
	});

	statements.push(
		buildIfStatementNode({
			condition: buildFuncCall(buildName(['is_string']), [
				buildArg(buildVariable('identity')),
			]),
			statements: [assignCandidate, nonEmptyCandidateGuard],
		})
	);

	statements.push(buildReturn(buildNull()));

	const method = buildClassMethod(
		buildIdentifier(`resolve${pascalName}Term`),
		{
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [buildParam(buildVariable('identity'))],
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

function createValidateIdentityHelper(
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
