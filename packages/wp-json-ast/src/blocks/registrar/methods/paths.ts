import {
	buildArg,
	buildClassMethod,
	buildIdentifier,
	buildName,
	buildNull,
	buildNullableType,
	buildParam,
	buildReturn,
	buildScalarString,
	buildStaticCall,
	buildVariable,
	PHP_METHOD_MODIFIER_PRIVATE,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildBooleanNot,
	buildBinaryOperation,
	buildFunctionCall,
	buildIfStatementNode,
	buildVariableAssignment,
	normaliseVariableReference,
} from '../../../resource/common/utils';
import { buildConcat, buildConstFetchExpr } from '../common';

export function buildResolveConfigPathMethod(): PhpStmtClassMethod {
	const stmts: PhpStmt[] = [
		buildIfStatementNode({
			condition: buildBinaryOperation(
				'BooleanOr',
				buildFunctionCall('empty', [
					buildArg(
						buildArrayDimFetch('config', buildVariable('key'))
					),
				]),
				buildBooleanNot(
					buildFunctionCall('is_string', [
						buildArg(
							buildArrayDimFetch('config', buildVariable('key'))
						),
					])
				)
			),
			statements: [buildReturn(buildNull())],
		}),
		buildVariableAssignment(
			normaliseVariableReference('path'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('normalise_relative'),
				[
					buildArg(buildVariable('root')),
					buildArg(
						buildArrayDimFetch('config', buildVariable('key'))
					),
				]
			)
		),
		buildIfStatementNode({
			condition: buildBooleanNot(
				buildFunctionCall('file_exists', [
					buildArg(buildVariable('path')),
				])
			),
			statements: [buildReturn(buildNull())],
		}),
		buildReturn(buildVariable('path')),
	];

	return buildClassMethod(buildIdentifier('resolve_config_path'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildNullableType(buildIdentifier('string')),
		params: [
			buildParam(buildVariable('root'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('config'), {
				type: buildIdentifier('array'),
			}),
			buildParam(buildVariable('key'), {
				type: buildIdentifier('string'),
			}),
		],
		stmts,
	});
}

export function buildResolveRenderPathMethod(): PhpStmtClassMethod {
	const stmts: PhpStmt[] = [
		buildVariableAssignment(
			normaliseVariableReference('path'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('resolve_config_path'),
				[
					buildArg(buildVariable('root')),
					buildArg(buildVariable('config')),
					buildArg(buildScalarString('render')),
				]
			)
		),
		buildIfStatementNode({
			condition: buildVariable('path'),
			statements: [buildReturn(buildVariable('path'))],
		}),
		buildVariableAssignment(
			normaliseVariableReference('directory'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('resolve_directory_fallback'),
				[
					buildArg(buildVariable('root')),
					buildArg(buildVariable('config')),
				]
			)
		),
		buildIfStatementNode({
			condition: buildBooleanNot(buildVariable('directory')),
			statements: [buildReturn(buildNull())],
		}),
		buildVariableAssignment(
			normaliseVariableReference('candidate'),
			buildConcat(
				buildConcat(
					buildVariable('directory'),
					buildConstFetchExpr('DIRECTORY_SEPARATOR')
				),
				buildScalarString('render.php')
			)
		),
		buildIfStatementNode({
			condition: buildBooleanNot(
				buildFunctionCall('file_exists', [
					buildArg(buildVariable('candidate')),
				])
			),
			statements: [buildReturn(buildNull())],
		}),
		buildReturn(buildVariable('candidate')),
	];

	return buildClassMethod(buildIdentifier('resolve_render_path'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildNullableType(buildIdentifier('string')),
		params: [
			buildParam(buildVariable('root'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('config'), {
				type: buildIdentifier('array'),
			}),
		],
		stmts,
	});
}

export function buildResolveDirectoryFallbackMethod(): PhpStmtClassMethod {
	const stmts: PhpStmt[] = [
		buildReturn(
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('resolve_config_path'),
				[
					buildArg(buildVariable('root')),
					buildArg(buildVariable('config')),
					buildArg(buildScalarString('directory')),
				]
			)
		),
	];

	return buildClassMethod(buildIdentifier('resolve_directory_fallback'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildNullableType(buildIdentifier('string')),
		params: [
			buildParam(buildVariable('root'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('config'), {
				type: buildIdentifier('array'),
			}),
		],
		stmts,
	});
}

export function buildNormaliseRelativeMethod(): PhpStmtClassMethod {
	const stmts: PhpStmt[] = [
		buildVariableAssignment(
			normaliseVariableReference('trimmed'),
			buildFunctionCall('ltrim', [
				buildArg(buildVariable('relative')),
				buildArg(buildScalarString('/')),
			])
		),
		buildVariableAssignment(
			normaliseVariableReference('normalised'),
			buildFunctionCall('str_replace', [
				buildArg(buildScalarString('/')),
				buildArg(buildConstFetchExpr('DIRECTORY_SEPARATOR')),
				buildArg(buildVariable('trimmed')),
			])
		),
		buildReturn(
			buildConcat(
				buildConcat(
					buildFunctionCall('rtrim', [
						buildArg(buildVariable('root')),
						buildArg(buildScalarString('/\\')),
					]),
					buildConstFetchExpr('DIRECTORY_SEPARATOR')
				),
				buildVariable('normalised')
			)
		),
	];

	return buildClassMethod(buildIdentifier('normalise_relative'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('string'),
		params: [
			buildParam(buildVariable('root'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('relative'), {
				type: buildIdentifier('string'),
			}),
		],
		stmts,
	});
}
