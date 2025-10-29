import {
	buildArg,
	buildClassMethod,
	buildExpressionStatement,
	buildIdentifier,
	buildName,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildStaticCall,
	buildVariable,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';
import {
	buildBooleanNot,
	buildForeachStatement,
	buildFunctionCall,
	buildIfStatementNode,
	buildVariableAssignment,
	normaliseVariableReference,
} from '../../../resource/common/utils';
import {
	buildConcat,
	buildConstFetchExpr,
	buildContinueStatement,
} from '../common';

export function buildRegisterMethod(): PhpStmtClassMethod {
	const manifestVariable = 'manifest_path';
	const entriesVariable = 'entries';
	const pluginRootVariable = 'plugin_root';

	const stmts: PhpStmt[] = [
		buildVariableAssignment(
			normaliseVariableReference(manifestVariable),
			buildConcat(
				buildFunctionCall('dirname', [
					buildArg(buildConstFetchExpr('__DIR__')),
					buildArg(buildScalarInt(2)),
				]),
				buildScalarString('/build/blocks-manifest.php')
			)
		),
		buildIfStatementNode({
			condition: buildBooleanNot(
				buildFunctionCall('file_exists', [
					buildArg(buildVariable(manifestVariable)),
				])
			),
			statements: [buildReturn(null)],
		}),
		buildVariableAssignment(
			normaliseVariableReference(entriesVariable),
			buildFunctionCall('require', [
				buildArg(buildVariable(manifestVariable)),
			])
		),
		buildIfStatementNode({
			condition: buildBooleanNot(
				buildFunctionCall('is_array', [
					buildArg(buildVariable(entriesVariable)),
				])
			),
			statements: [buildReturn(null)],
		}),
		buildVariableAssignment(
			normaliseVariableReference(pluginRootVariable),
			buildFunctionCall('dirname', [
				buildArg(buildConstFetchExpr('__DIR__')),
				buildArg(buildScalarInt(2)),
			])
		),
		buildForeachStatement({
			iterable: buildVariable(entriesVariable),
			key: buildVariable('block'),
			value: buildVariable('config'),
			statements: buildRegisterForeachStatements({
				pluginRootVariable,
			}),
		}),
	];

	return buildClassMethod(buildIdentifier('register'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('void'),
		stmts,
	});
}

function buildRegisterForeachStatements({
	pluginRootVariable,
}: {
	readonly pluginRootVariable: string;
}): PhpStmt[] {
	const metadataVariable = 'metadata_path';
	const renderVariable = 'render_path';
	const configVariable = 'config';

	return [
		buildIfStatementNode({
			condition: buildBooleanNot(
				buildFunctionCall('is_array', [
					buildArg(buildVariable(configVariable)),
				])
			),
			statements: [buildContinueStatement()],
		}),
		buildVariableAssignment(
			normaliseVariableReference(metadataVariable),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('resolve_config_path'),
				[
					buildArg(buildVariable(pluginRootVariable)),
					buildArg(buildVariable(configVariable)),
					buildArg(buildScalarString('manifest')),
				]
			)
		),
		buildIfStatementNode({
			condition: buildBooleanNot(buildVariable(metadataVariable)),
			statements: [
				buildVariableAssignment(
					normaliseVariableReference(metadataVariable),
					buildStaticCall(
						buildName(['self']),
						buildIdentifier('resolve_directory_fallback'),
						[
							buildArg(buildVariable(pluginRootVariable)),
							buildArg(buildVariable(configVariable)),
						]
					)
				),
			],
		}),
		buildIfStatementNode({
			condition: buildBooleanNot(buildVariable(metadataVariable)),
			statements: [buildContinueStatement()],
		}),
		buildVariableAssignment(
			normaliseVariableReference(renderVariable),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('resolve_render_path'),
				[
					buildArg(buildVariable(pluginRootVariable)),
					buildArg(buildVariable(configVariable)),
				]
			)
		),
		buildIfStatementNode({
			condition: buildVariable(renderVariable),
			statements: [
				buildExpressionStatement(
					buildFunctionCall('register_block_type_from_metadata', [
						buildArg(buildVariable(metadataVariable)),
						buildArg(
							buildStaticCall(
								buildName(['self']),
								buildIdentifier('build_render_arguments'),
								[buildArg(buildVariable(renderVariable))]
							)
						),
					])
				),
				buildContinueStatement(),
			],
		}),
		buildExpressionStatement(
			buildFunctionCall('register_block_type_from_metadata', [
				buildArg(buildVariable(metadataVariable)),
			])
		),
	];
}
