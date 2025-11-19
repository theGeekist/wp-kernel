import {
	buildAssign,
	buildArg,
	buildArray,
	buildArrayItem,
	buildClassMethod,
	buildClosure,
	buildClosureUse,
	buildExpressionStatement,
	buildIdentifier,
	buildName,
	buildNull,
	buildNullableType,
	buildParam,
	buildReturn,
	buildScalarCast,
	buildScalarString,
	buildStaticCall,
	buildVariable,
	buildFullyQualifiedName,
	buildFuncCall,
	PHP_METHOD_MODIFIER_PRIVATE,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';
import {
	buildBooleanNot,
	buildFunctionCall,
	buildIfStatementNode,
} from '../../../resource/common/utils';

/**
 * @category WordPress AST
 */
export function buildBuildRenderArgumentsMethod(): PhpStmtClassMethod {
	const closure = buildClosure({
		static: true,
		params: [
			buildParam(buildVariable('attributes'), {
				type: buildIdentifier('array'),
				default: buildArray([]),
			}),
			buildParam(buildVariable('content'), {
				type: buildIdentifier('string'),
				default: buildScalarString(''),
			}),
			buildParam(buildVariable('block'), {
				type: buildNullableType(buildFullyQualifiedName(['WP_Block'])),
				default: buildNull(),
			}),
		],
		uses: [buildClosureUse(buildVariable('render_path'))],
		returnType: buildIdentifier('string'),
		stmts: [
			buildReturn(
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('render_template'),
					[
						buildArg(buildVariable('render_path')),
						buildArg(buildVariable('attributes')),
						buildArg(buildVariable('content')),
						buildArg(buildVariable('block')),
					]
				)
			),
		],
	});

	const stmts: PhpStmt[] = [
		buildReturn(
			buildArray([
				buildArrayItem(closure, {
					key: buildScalarString('render_callback'),
				}),
			])
		),
	];

	return buildClassMethod(buildIdentifier('build_render_arguments'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('array'),
		params: [
			buildParam(buildVariable('render_path'), {
				type: buildIdentifier('string'),
			}),
		],
		stmts,
	});
}

/**
 * @category WordPress AST
 */
export function buildRenderTemplateMethod(): PhpStmtClassMethod {
	const stmts: PhpStmt[] = [
		buildIfStatementNode({
			condition: buildBooleanNot(
				buildFunctionCall('file_exists', [
					buildArg(buildVariable('render_path')),
				])
			),
			statements: [buildReturn(buildVariable('content'))],
		}),
		buildExpressionStatement(buildFunctionCall('ob_start', [])),
		buildExpressionStatement(
			buildAssign(
				buildVariable('render_callback'),
				buildFunctionCall('require', [
					buildArg(buildVariable('render_path')),
				])
			)
		),
		buildExpressionStatement(
			buildAssign(
				buildVariable('buffer'),
				buildFunctionCall('ob_get_clean', [])
			)
		),
		buildIfStatementNode({
			condition: buildFunctionCall('is_callable', [
				buildArg(buildVariable('render_callback')),
			]),
			statements: [
				buildReturn(
					buildScalarCast(
						'string',
						buildFuncCall(buildVariable('render_callback'), [
							buildArg(buildVariable('attributes')),
							buildArg(buildVariable('content')),
							buildArg(buildVariable('block')),
						])
					)
				),
			],
		}),
		buildReturn(buildScalarCast('string', buildVariable('buffer'))),
	];

	return buildClassMethod(buildIdentifier('render_template'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('string'),
		params: [
			buildParam(buildVariable('render_path'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('attributes'), {
				type: buildIdentifier('array'),
			}),
			buildParam(buildVariable('content'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('block'), {
				type: buildNullableType(buildFullyQualifiedName(['WP_Block'])),
				default: buildNull(),
			}),
		],
		stmts,
	});
}
