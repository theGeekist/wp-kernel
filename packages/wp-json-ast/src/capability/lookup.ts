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
	buildName,
	buildNew,
	buildNull,
	buildNullableType,
	buildParam,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildStaticCall,
	buildTernary,
	buildVariable,
	PHP_METHOD_MODIFIER_PRIVATE,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

export function buildGetDefinitionMethod(): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('get_definition'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		params: [
			buildParam(buildVariable('capability_key'), {
				type: buildIdentifier('string'),
			}),
		],
		returnType: buildIdentifier('array'),
		stmts: [
			buildExpressionStatement(
				buildAssign(
					buildVariable('map'),
					buildStaticCall(
						buildName(['self']),
						buildIdentifier('capability_map'),
						[]
					)
				)
			),
			buildIfStatement(
				buildFuncCall(buildName(['isset']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('map'),
							buildVariable('capability_key')
						)
					),
				]),
				[
					buildReturn(
						buildArrayDimFetch(
							buildVariable('map'),
							buildVariable('capability_key')
						)
					),
				]
			),
			buildReturn(
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('fallback'),
					[]
				)
			),
		],
	});
}

export function buildGetBindingMethod(): PhpStmtClassMethod {
	const statements: PhpStmt[] = [
		buildExpressionStatement(
			buildAssign(buildVariable('binding'), buildTernaryBinding())
		),
		buildIfStatement(
			buildBinaryOperation(
				'BooleanAnd',
				buildFuncCall(buildName(['is_string']), [
					buildArg(buildVariable('binding')),
				]),
				buildBinaryOperation(
					'NotIdentical',
					buildVariable('binding'),
					buildScalarString('')
				)
			),
			[buildReturn(buildVariable('binding'))]
		),
		buildReturn(buildNull()),
	];

	return buildClassMethod(buildIdentifier('get_binding'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		params: [
			buildParam(buildVariable('definition'), {
				type: buildIdentifier('array'),
			}),
		],
		returnType: buildNullableType(buildIdentifier('string')),
		stmts: statements,
	});
}

export function buildCreateErrorMethod(): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('create_error'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		params: [
			buildParam(buildVariable('code'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('message'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('context'), {
				type: buildIdentifier('array'),
				default: buildArray([]),
			}),
		],
		returnType: buildIdentifier('WP_Error'),
		stmts: [
			buildExpressionStatement(
				buildAssign(
					buildVariable('payload'),
					buildFuncCall(buildName(['array_merge']), [
						buildArg(
							buildArray([
								buildArrayItem(buildScalarInt(403), {
									key: buildScalarString('status'),
								}),
							])
						),
						buildArg(buildVariable('context')),
					])
				)
			),
			buildReturn(
				buildNew(buildName(['WP_Error']), [
					buildArg(buildVariable('code')),
					buildArg(buildVariable('message')),
					buildArg(buildVariable('payload')),
				])
			),
		],
	});
}

function buildTernaryBinding() {
	return buildTernary(
		buildFuncCall(buildName(['isset']), [
			buildArg(
				buildArrayDimFetch(
					buildVariable('definition'),
					buildScalarString('binding')
				)
			),
		]),
		buildArrayDimFetch(
			buildVariable('definition'),
			buildScalarString('binding')
		),
		buildNull()
	);
}
