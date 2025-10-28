import {
	buildArg,
	buildArray,
	buildArrayDimFetch,
	buildArrayItem,
	buildAssign,
	buildBinaryOperation,
	buildClassMethod,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildNull,
	buildParam,
	buildReturn,
	buildScalarBool,
	buildScalarString,
	buildStaticCall,
	buildTernary,
	buildVariable,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import {
	buildDocCommentAttributes,
	buildPolicyEnforceDocblock,
} from '../common/docblock';

export function buildEnforceMethod(): PhpStmtClassMethod {
	const docblock = buildPolicyEnforceDocblock();

	const definitionAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('definition'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('get_definition'),
				[buildArg(buildVariable('policy_key'))]
			)
		)
	);

	const fallbackAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('fallback'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('fallback'),
				[]
			)
		)
	);

	const capabilityAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('capability'),
			buildTernary(
				buildFuncCall(buildName(['isset']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('definition'),
							buildScalarString('capability')
						)
					),
				]),
				buildArrayDimFetch(
					buildVariable('definition'),
					buildScalarString('capability')
				),
				buildArrayDimFetch(
					buildVariable('fallback'),
					buildScalarString('capability')
				)
			)
		)
	);

	const scopeAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('scope'),
			buildTernary(
				buildFuncCall(buildName(['isset']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('definition'),
							buildScalarString('appliesTo')
						)
					),
				]),
				buildArrayDimFetch(
					buildVariable('definition'),
					buildScalarString('appliesTo')
				),
				buildArrayDimFetch(
					buildVariable('fallback'),
					buildScalarString('appliesTo')
				)
			)
		)
	);

	const allowedDefaultAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('allowed'),
			buildFuncCall(buildName(['current_user_can']), [
				buildArg(buildVariable('capability')),
			])
		)
	);

	const bindingAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('binding'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('get_binding'),
				[buildArg(buildVariable('definition'))]
			)
		)
	);

	const ensureBindingStatement = buildIfStatement(
		buildBinaryOperation(
			'Identical',
			buildVariable('binding'),
			buildNull()
		),
		[
			buildExpressionStatement(
				buildAssign(buildVariable('binding'), buildScalarString('id'))
			),
		]
	);

	const objectIdAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('object_id'),
			buildMethodCall(
				buildVariable('request'),
				buildIdentifier('get_param'),
				[buildArg(buildVariable('binding'))]
			)
		)
	);

	const missingObjectGuard = buildIfStatement(
		buildBinaryOperation(
			'Identical',
			buildVariable('object_id'),
			buildNull()
		),
		[
			buildReturn(
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('create_error'),
					[
						buildArg(
							buildScalarString('wpk_policy_object_missing')
						),
						buildArg(
							buildFuncCall(buildName(['sprintf']), [
								buildArg(
									buildScalarString(
										'Object identifier parameter "%s" missing for policy "%s".'
									)
								),
								buildArg(buildVariable('binding')),
								buildArg(buildVariable('policy_key')),
							])
						),
					]
				)
			),
		]
	);

	const allowedObjectAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('allowed'),
			buildFuncCall(buildName(['current_user_can']), [
				buildArg(buildVariable('capability')),
				buildArg(buildVariable('object_id')),
			])
		)
	);

	const objectScopeBlock = buildIfStatement(
		buildBinaryOperation(
			'Identical',
			buildScalarString('object'),
			buildVariable('scope')
		),
		[
			bindingAssign,
			ensureBindingStatement,
			objectIdAssign,
			missingObjectGuard,
			allowedObjectAssign,
		]
	);

	const allowedGuard = buildIfStatement(buildVariable('allowed'), [
		buildReturn(buildScalarBool(true)),
	]);

	const deniedReturn = buildReturn(
		buildStaticCall(buildName(['self']), buildIdentifier('create_error'), [
			buildArg(buildScalarString('wpk_policy_denied')),
			buildArg(
				buildScalarString('You are not allowed to perform this action.')
			),
			buildArg(
				buildArray([
					buildArrayItem(buildVariable('policy_key'), {
						key: buildScalarString('policy'),
					}),
					buildArrayItem(buildVariable('capability'), {
						key: buildScalarString('capability'),
					}),
				])
			),
		])
	);

	const statements: PhpStmt[] = [
		definitionAssign,
		fallbackAssign,
		capabilityAssign,
		scopeAssign,
		allowedDefaultAssign,
		objectScopeBlock,
		allowedGuard,
		deniedReturn,
	];

	return buildClassMethod(
		buildIdentifier('enforce'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
			params: [
				buildParam(buildVariable('policy_key'), {
					type: buildIdentifier('string'),
				}),
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
			stmts: statements,
		},
		buildDocCommentAttributes(docblock)
	);
}
