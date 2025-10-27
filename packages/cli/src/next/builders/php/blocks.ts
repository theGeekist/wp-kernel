import path from 'node:path';
import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderInput,
	BuilderNext,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import type { IRv1 } from '../../../ir/types';
import { collectBlockManifests } from '../blocks/manifest';
import type {
	BlockManifestEntry,
	ProcessedBlockManifest,
} from '../blocks/manifest';
import { sanitizeJson } from './utils';
import {
	appendGeneratedFileDocblock,
	buildArg,
	buildArray,
	buildArrayItem,
	buildClass,
	buildClassMethod,
	buildClosure,
	buildContinue,
	buildExpressionStatement,
	buildIdentifier,
	buildName,
	buildNull,
	buildNullableType,
	buildParam,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildStaticCall,
	buildVariable,
	createPhpFileBuilder,
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PRIVATE,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpAstBuilderAdapter,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildBinaryOperation,
	buildBooleanNot,
	buildForeachStatement,
	buildFunctionCall,
	buildIfStatementNode,
	buildScalarCast,
	buildVariableAssignment,
	normaliseVariableReference,
} from './resource/utils';
import { renderPhpValue } from './resource/phpValue';
import type { Workspace } from '../../workspace/types';

const RENDER_TRANSACTION_LABEL = 'builder.generate.php.blocks.render';

export function createPhpBlocksHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.blocks',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, context, output, reporter } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const ir = input.ir;
			const blocks = ir.blocks.filter((block) => block.hasRender);
			if (blocks.length === 0) {
				reporter.debug(
					'createPhpBlocksHelper: no SSR blocks discovered.'
				);
				await next?.();
				return;
			}

			const processedMap = await collectBlockManifests({
				workspace: context.workspace,
				blocks,
			});

			const processedBlocks = blocks
				.map((block) => processedMap.get(block.key))
				.filter((entry): entry is ProcessedBlockManifest =>
					Boolean(entry)
				);

			const { manifestEntries, renderStubs } = collatePhpBlockArtifacts({
				processedBlocks,
				reporter,
			});

			await stageRenderStubs({
				stubs: renderStubs,
				workspace: context.workspace,
				output,
				reporter,
			});

			if (Object.keys(manifestEntries).length === 0) {
				reporter.debug(
					'createPhpBlocksHelper: no manifest entries produced.'
				);
				await next?.();
				return;
			}

			const manifestHelper = buildBlocksManifestHelper({
				ir,
				manifestEntries,
			});
			const registrarHelper = buildBlocksRegistrarHelper({ ir });

			await manifestHelper.apply(options);
			await registrarHelper.apply(options);

			reporter.debug(
				'createPhpBlocksHelper: queued SSR block manifest and registrar.'
			);

			await next?.();
		},
	});
}

interface StageRenderStubsOptions {
	readonly stubs: readonly NonNullable<
		ProcessedBlockManifest['renderStub']
	>[];
	readonly workspace: Workspace;
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
}

async function stageRenderStubs({
	stubs,
	workspace,
	output,
	reporter,
}: StageRenderStubsOptions): Promise<void> {
	if (stubs.length === 0) {
		return;
	}

	workspace.begin(RENDER_TRANSACTION_LABEL);
	try {
		for (const stub of stubs) {
			await workspace.write(stub.path, stub.contents, {
				ensureDir: true,
			});
		}
		const manifest = await workspace.commit(RENDER_TRANSACTION_LABEL);
		await queueWorkspaceFiles(workspace, output, manifest.writes);
		reporter.debug('createPhpBlocksHelper: render stubs emitted.', {
			files: manifest.writes,
		});
	} catch (error) {
		await workspace.rollback(RENDER_TRANSACTION_LABEL);
		throw error;
	}
}

async function queueWorkspaceFiles(
	workspace: Workspace,
	output: BuilderOutput,
	files: readonly string[]
): Promise<void> {
	for (const file of files) {
		const data = await workspace.read(file);
		if (!data) {
			continue;
		}

		output.queueWrite({
			file,
			contents: data.toString('utf8'),
		});
	}
}

function collatePhpBlockArtifacts(options: {
	readonly processedBlocks: readonly ProcessedBlockManifest[];
	readonly reporter: BuilderApplyOptions['reporter'];
}): {
	readonly manifestEntries: Record<string, BlockManifestEntry>;
	readonly renderStubs: readonly NonNullable<
		ProcessedBlockManifest['renderStub']
	>[];
} {
	const manifestEntries: Record<string, BlockManifestEntry> = {};
	const renderStubs: NonNullable<ProcessedBlockManifest['renderStub']>[] = [];

	for (const processed of options.processedBlocks) {
		for (const warning of processed.warnings) {
			options.reporter.warn(warning);
		}

		if (processed.manifestEntry) {
			manifestEntries[processed.block.key] = processed.manifestEntry;
		}

		if (processed.renderStub) {
			renderStubs.push(processed.renderStub);
		}
	}

	return { manifestEntries, renderStubs };
}

function buildConstFetchExpr(name: string) {
	return buildFunctionCall('constant', [buildArg(buildScalarString(name))]);
}

function buildBlocksManifestHelper({
	ir,
	manifestEntries,
}: {
	readonly ir: IRv1;
	readonly manifestEntries: Record<string, BlockManifestEntry>;
}): BuilderHelper {
	const filePath = path.join(
		path.dirname(ir.php.outputDir),
		'build',
		'blocks-manifest.php'
	);

	return createPhpFileBuilder<PipelineContext, BuilderInput, BuilderOutput>({
		key: 'php-blocks-manifest',
		filePath,
		namespace: '',
		metadata: { kind: 'block-manifest' },
		build: (builder) => {
			appendGeneratedFileDocblock(builder, [
				`Source: ${ir.meta.origin} → blocks.ssr.manifest`,
			]);

			const payload = sanitizeJson(manifestEntries);
			builder.appendProgramStatement(
				buildReturn(renderPhpValue(payload))
			);
		},
	});
}

function buildBlocksRegistrarHelper({
	ir,
}: {
	readonly ir: IRv1;
}): BuilderHelper {
	const filePath = path.join(ir.php.outputDir, 'Blocks', 'Register.php');

	return createPhpFileBuilder<PipelineContext, BuilderInput, BuilderOutput>({
		key: 'php-blocks-registrar',
		filePath,
		namespace: `${ir.php.namespace}\\Blocks`,
		metadata: { kind: 'block-registrar' },
		build: (builder) => buildRegistrarClass(builder, ir),
	});
}

function buildRegistrarClass(builder: PhpAstBuilderAdapter, ir: IRv1): void {
	appendGeneratedFileDocblock(builder, [
		`Source: ${ir.meta.origin} → blocks.ssr.register`,
	]);

	builder.addUse('function register_block_type_from_metadata');

	const methods: PhpStmtClassMethod[] = [
		buildRegisterMethod(),
		buildResolveConfigPathMethod(),
		buildResolveRenderPathMethod(),
		buildBuildRenderArgumentsMethod(),
		buildRenderTemplateMethod(),
		buildResolveDirectoryFallbackMethod(),
		buildNormaliseRelativeMethod(),
	];

	const classNode = buildClass(buildIdentifier('Register'), {
		flags: PHP_CLASS_MODIFIER_FINAL,
		stmts: methods,
	});

	builder.appendProgramStatement(classNode);
}

function buildRegisterMethod(): PhpStmtClassMethod {
	const manifestVariable = 'manifest_path';
	const entriesVariable = 'entries';
	const pluginRootVariable = 'plugin_root';

	const stmts: PhpStmt[] = [
		buildVariableAssignment(
			normaliseVariableReference(manifestVariable),
			buildBinaryOperation(
				'Concat',
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

function buildResolveConfigPathMethod(): PhpStmtClassMethod {
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

function buildResolveRenderPathMethod(): PhpStmtClassMethod {
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
			buildBinaryOperation(
				'Concat',
				buildBinaryOperation(
					'Concat',
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

function buildResolveDirectoryFallbackMethod(): PhpStmtClassMethod {
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

function buildBuildRenderArgumentsMethod(): PhpStmtClassMethod {
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
				type: buildNullableType(buildName(['\\WP_Block'])),
				default: buildNull(),
			}),
		],
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

function buildRenderTemplateMethod(): PhpStmtClassMethod {
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
			buildFunctionCall('require', [
				buildArg(buildVariable('render_path')),
			])
		),
		buildReturn(
			buildScalarCast('string', buildFunctionCall('ob_get_clean', []))
		),
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
				type: buildNullableType(buildName(['\\WP_Block'])),
				default: buildNull(),
			}),
		],
		stmts,
	});
}

function buildNormaliseRelativeMethod(): PhpStmtClassMethod {
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
			buildBinaryOperation(
				'Concat',
				buildBinaryOperation(
					'Concat',
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

function buildContinueStatement(): PhpStmt {
	return buildContinue();
}
