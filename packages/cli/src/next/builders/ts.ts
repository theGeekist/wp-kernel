import { createHash as buildHash } from 'node:crypto';
import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceConfig } from '@wpkernel/core/resource';
import {
	IndentationText,
	NewLineKind,
	Project,
	QuoteKind,
	type SourceFile,
	VariableDeclarationKind,
} from 'ts-morph';
import { WPKernelError } from '@wpkernel/core/error';
import type { IRv1 } from '../ir/publicTypes';
import type { WPKernelConfigV1 } from '../../config/types';
import { createHelper } from '../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderOutput,
	PipelinePhase,
} from '../runtime/types';
import type { Workspace } from '../workspace/types';
import { validateGeneratedImports } from '../../commands/run-generate/validation';
import type { GenerationSummary } from '../../commands/run-generate/types';
import {
	buildModuleSpecifier,
	resolveKernelImport,
	resolveResourceImport,
	toCamelCase,
	toPascalCase,
} from './ts/shared';
const GENERATED_ROOT = '.generated';

export interface TsBuilderEmitOptions {
	readonly filePath: string;
	readonly sourceFile: SourceFile;
}

export interface TsBuilderLifecycleHooks {
	readonly onBeforeCreate?: (
		context: Omit<TsBuilderCreatorContext, 'hooks'>
	) => Promise<void>;
	readonly onAfterCreate?: (
		context: Omit<TsBuilderCreatorContext, 'hooks'>
	) => Promise<void>;
	readonly onAfterEmit?: (
		options: TsBuilderAfterEmitOptions
	) => Promise<void>;
}

export interface TsBuilderAfterEmitOptions {
	readonly emitted: readonly string[];
	readonly workspace: Workspace;
	readonly reporter: Reporter;
}

export interface TsBuilderCreatorContext {
	readonly project: Project;
	readonly workspace: Workspace;
	readonly descriptor: ResourceDescriptor;
	readonly config: WPKernelConfigV1;
	readonly sourcePath: string;
	readonly ir: IRv1;
	readonly reporter: Reporter;
	readonly emit: (options: TsBuilderEmitOptions) => Promise<void>;
}

export interface TsBuilderCreator {
	readonly key: string;
	create: (context: TsBuilderCreatorContext) => Promise<void>;
}

export interface CreateTsBuilderOptions {
	readonly creators?: readonly TsBuilderCreator[];
	readonly projectFactory?: () => Project;
	readonly hooks?: TsBuilderLifecycleHooks;
}

export interface TsFormatterFormatOptions {
	readonly filePath: string;
	readonly contents: string;
}

export interface TsFormatter {
	format: (options: TsFormatterFormatOptions) => Promise<string>;
}

export interface BuildTsFormatterOptions {
	readonly projectFactory?: () => Project;
}

type ResourceUiConfig = NonNullable<ResourceConfig['ui']>;
type ResourceAdminConfig = NonNullable<ResourceUiConfig['admin']>;
type AdminDataViews = NonNullable<ResourceAdminConfig['dataviews']>;

export interface ResourceDescriptor {
	readonly key: string;
	readonly name: string;
	readonly config: ResourceConfig;
	readonly dataviews: AdminDataViews;
}

export function createTsBuilder(
	options: CreateTsBuilderOptions = {}
): BuilderHelper {
	const creators = options.creators?.slice() ?? [
		buildAdminScreenCreator(),
		buildDataViewFixtureCreator(),
	];
	const projectFactory = options.projectFactory ?? buildProject;
	const lifecycleHooks = options.hooks ?? {};

	return createHelper({
		key: 'builder.generate.ts.core',
		kind: 'builder',
		async apply({ context, input, output, reporter }: BuilderApplyOptions) {
			if (!isGeneratePhase(input.phase, reporter)) {
				return;
			}

			const ir = requireIr(input.ir);

			const emittedFiles: string[] = [];
			const descriptors = collectResourceDescriptors(
				input.options.config.resources
			);

			if (descriptors.length === 0) {
				reporter.debug('createTsBuilder: no resources registered.');
				return;
			}

			const project = projectFactory();
			const emit = buildEmitter(context.workspace, output, emittedFiles);

			await generateArtifacts({
				descriptors,
				creators,
				project,
				lifecycleHooks,
				context,
				input: { ...input, ir },
				reporter,
				emit,
				emittedFiles,
			});

			await notifyAfterEmit({
				hooks: lifecycleHooks,
				emittedFiles,
				workspace: context.workspace,
				reporter,
			});

			await runImportValidation({
				emittedFiles,
				workspace: context.workspace,
				reporter,
			});

			logEmissionSummary(reporter, emittedFiles);
		},
	});
}

export function buildAdminScreenCreator(): TsBuilderCreator {
	return {
		key: 'builder.generate.ts.adminScreen.core',
		async create(context) {
			const { descriptor } = context;
			const screenConfig = descriptor.dataviews.screen ?? {};
			const componentName =
				screenConfig.component ??
				`${toPascalCase(descriptor.name)}AdminScreen`;
			const resourceSymbol =
				screenConfig.resourceSymbol ?? toCamelCase(descriptor.name);
			const kernelSymbol = screenConfig.kernelSymbol ?? 'kernel';

			const screenDir = path.join(
				GENERATED_ROOT,
				'ui',
				'app',
				descriptor.name,
				'admin'
			);
			const screenPath = path.join(screenDir, `${componentName}.tsx`);

			const [resourceImport, kernelImport] = await Promise.all([
				resolveResourceImport({
					workspace: context.workspace,
					from: screenPath,
					configured: screenConfig.resourceImport,
					resourceKey: descriptor.key,
				}),
				resolveKernelImport({
					workspace: context.workspace,
					from: screenPath,
					configured: screenConfig.kernelImport,
				}),
			]);

			const sourceFile = context.project.createSourceFile(
				screenPath,
				'',
				{
					overwrite: true,
				}
			);

			sourceFile.addStatements(
				'/** @jsxImportSource @wordpress/element */'
			);
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/core/contracts',
				namedImports: ['WPKernelError'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/ui',
				namedImports: ['WPKernelUIProvider', 'useWPKernelUI'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/ui/dataviews',
				namedImports: ['ResourceDataView'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: kernelImport,
				namedImports: [{ name: kernelSymbol }],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: resourceImport,
				namedImports: [{ name: resourceSymbol }],
			});

			const route = screenConfig.route;
			if (route) {
				sourceFile.addVariableStatement({
					isExported: true,
					declarationKind: VariableDeclarationKind.Const,
					declarations: [
						{
							name: `${toCamelCase(componentName)}Route`,
							initializer: (writer) => {
								writer.quote(route);
							},
						},
					],
				});
			}

			const contentComponentName = `${componentName}Content`;

			sourceFile.addFunction({
				name: contentComponentName,
				statements: (writer) => {
					writer.writeLine('const runtime = useWPKernelUI();');
					writer.writeLine('return (');
					writer.indent(() => {
						writer.writeLine('<ResourceDataView');
						writer.indent(() => {
							writer.writeLine(`resource={${resourceSymbol}}`);
							writer.writeLine(
								`config={${resourceSymbol}.ui?.admin?.dataviews}`
							);
							writer.writeLine('runtime={runtime}');
						});
						writer.writeLine('/>');
					});
					writer.writeLine(');');
				},
			});

			sourceFile.addFunction({
				name: componentName,
				isExported: true,
				statements: (writer) => {
					writer.writeLine(
						`const runtime = ${kernelSymbol}.getUIRuntime?.();`
					);
					writer.writeLine('if (!runtime) {');
					writer.indent(() => {
						writer.writeLine(
							"throw new WPKernelError('DeveloperError', {"
						);
						writer.indent(() => {
							writer.writeLine(
								"message: 'UI runtime not attached.',"
							);
							writer.write('context: { resourceName: ');
							writer.quote(descriptor.name);
							writer.writeLine(' },');
						});
						writer.writeLine('});');
					});
					writer.writeLine('}');
					writer.blankLine();
					writer.writeLine('return (');
					writer.indent(() => {
						writer.writeLine(
							'<WPKernelUIProvider runtime={runtime}>'
						);
						writer.indent(() => {
							writer.writeLine(`<${contentComponentName} />`);
						});
						writer.writeLine('</WPKernelUIProvider>');
					});
					writer.writeLine(');');
				},
			});

			await context.emit({ filePath: screenPath, sourceFile });
		},
	};
}

export function buildDataViewFixtureCreator(): TsBuilderCreator {
	return {
		key: 'builder.generate.ts.dataviewFixture.core',
		async create(context) {
			const { descriptor } = context;
			const fixturePath = path.join(
				GENERATED_ROOT,
				'ui',
				'fixtures',
				'dataviews',
				`${descriptor.key}.ts`
			);
			const configImport = buildModuleSpecifier({
				workspace: context.workspace,
				from: fixturePath,
				target: context.sourcePath,
			});
			const identifier = `${toCamelCase(descriptor.name)}DataViewConfig`;

			const sourceFile = context.project.createSourceFile(
				fixturePath,
				'',
				{
					overwrite: true,
				}
			);

			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/ui/dataviews',
				namedImports: [
					{
						name: 'ResourceDataViewConfig',
						isTypeOnly: true,
					},
				],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: configImport,
				namespaceImport: 'wpkConfigModule',
			});
			sourceFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: identifier,
						type: 'ResourceDataViewConfig<unknown, unknown>',
						initializer: (writer) => {
							writer.write(
								'wpkConfigModule.wpkConfig.resources['
							);
							writer.quote(descriptor.key);
							writer.write('].ui!.admin!.dataviews');
						},
					},
				],
			});

			await context.emit({ filePath: fixturePath, sourceFile });
		},
	};
}

function collectResourceDescriptors(
	resources: Record<string, ResourceConfig> | undefined
): ResourceDescriptor[] {
	const descriptors: ResourceDescriptor[] = [];

	if (!resources) {
		return descriptors;
	}

	for (const [key, resourceConfig] of Object.entries(resources)) {
		const dataviews = resourceConfig.ui?.admin?.dataviews;
		if (!dataviews) {
			continue;
		}

		descriptors.push({
			key,
			name: resourceConfig.name ?? key,
			config: resourceConfig,
			dataviews: dataviews as AdminDataViews,
		});
	}

	return descriptors;
}

function buildProject(): Project {
	return new Project({
		useInMemoryFileSystem: true,
		manipulationSettings: {
			indentationText: IndentationText.TwoSpaces,
			quoteKind: QuoteKind.Single,
			newLineKind: NewLineKind.LineFeed,
		},
	});
}

export function buildTsFormatter(
	options: BuildTsFormatterOptions = {}
): TsFormatter {
	const projectFactory = options.projectFactory ?? buildProject;
	const project = projectFactory();

	async function format(
		formatOptions: TsFormatterFormatOptions
	): Promise<string> {
		const sourceFile = project.createSourceFile(
			formatOptions.filePath,
			formatOptions.contents,
			{
				overwrite: true,
			}
		);

		sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
		const formatted = sourceFile.getFullText();
		sourceFile.forget();

		return formatted;
	}

	return { format };
}

function buildEmitter(
	workspace: Workspace,
	output: BuilderOutput,
	emittedFiles: string[]
): (options: TsBuilderEmitOptions) => Promise<void> {
	return async ({ filePath, sourceFile }: TsBuilderEmitOptions) => {
		sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
		const contents = sourceFile.getFullText();

		await workspace.write(filePath, contents);
		output.queueWrite({ file: filePath, contents });
		emittedFiles.push(filePath);

		sourceFile.forget();
	};
}

function isGeneratePhase(phase: PipelinePhase, reporter: Reporter): boolean {
	if (phase === 'generate') {
		return true;
	}

	reporter.debug('createTsBuilder: skipping phase.', { phase });
	return false;
}

function requireIr(ir: IRv1 | null): IRv1 {
	if (ir) {
		return ir;
	}

	throw new WPKernelError('ValidationError', {
		message: 'createTsBuilder requires an IR instance during execution.',
	});
}

async function generateArtifacts(options: {
	readonly descriptors: readonly ResourceDescriptor[];
	readonly creators: readonly TsBuilderCreator[];
	readonly project: Project;
	readonly lifecycleHooks: TsBuilderLifecycleHooks;
	readonly context: Parameters<BuilderHelper['apply']>[0]['context'];
	readonly input: Parameters<BuilderHelper['apply']>[0]['input'] & {
		ir: IRv1;
	};
	readonly reporter: Reporter;
	readonly emit: (options: TsBuilderEmitOptions) => Promise<void>;
	readonly emittedFiles: string[];
}): Promise<void> {
	const {
		descriptors,
		creators,
		project,
		lifecycleHooks,
		context,
		input,
		reporter,
		emit,
	} = options;

	for (const descriptor of descriptors) {
		const creatorContext: TsBuilderCreatorContext = {
			project,
			workspace: context.workspace,
			descriptor,
			config: input.options.config,
			sourcePath: input.options.sourcePath,
			ir: input.ir,
			reporter,
			emit,
		};

		for (const creator of creators) {
			if (lifecycleHooks.onBeforeCreate) {
				await lifecycleHooks.onBeforeCreate(creatorContext);
			}
			await creator.create(creatorContext);
			if (lifecycleHooks.onAfterCreate) {
				await lifecycleHooks.onAfterCreate(creatorContext);
			}
		}
	}
}

async function notifyAfterEmit(options: {
	readonly hooks: TsBuilderLifecycleHooks;
	readonly emittedFiles: readonly string[];
	readonly workspace: Workspace;
	readonly reporter: Reporter;
}): Promise<void> {
	if (!options.hooks.onAfterEmit) {
		return;
	}

	await options.hooks.onAfterEmit({
		emitted: [...options.emittedFiles],
		workspace: options.workspace,
		reporter: options.reporter,
	});
}

function logEmissionSummary(
	reporter: Reporter,
	emittedFiles: readonly string[]
): void {
	if (emittedFiles.length === 0) {
		reporter.debug('createTsBuilder: generated TypeScript artifacts.');
		return;
	}

	const previewList = emittedFiles
		.slice(0, 3)
		.map((file) => file.replace(/\\/g, '/'))
		.join(', ');
	const suffix = emittedFiles.length > 3 ? ', …' : '';
	reporter.debug(
		`createTsBuilder: ${emittedFiles.length} files written (${previewList}${suffix})`
	);
}

async function buildGenerationSummary(
	emittedFiles: readonly string[],
	workspace: Workspace
): Promise<GenerationSummary> {
	const entries = [] as GenerationSummary['entries'];

	for (const file of emittedFiles) {
		const contents = await workspace.read(file);
		const data = contents ? contents.toString('utf8') : '';
		const hash = buildHash('sha256').update(data).digest('hex');

		entries.push({
			path: file.replace(/\\/g, '/'),
			status: 'written',
			hash,
		});
	}

	const counts = {
		written: entries.length,
		unchanged: 0,
		skipped: 0,
	} as GenerationSummary['counts'];

	return {
		dryRun: false,
		counts,
		entries,
	};
}

async function runImportValidation(options: {
	readonly emittedFiles: readonly string[];
	readonly workspace: Workspace;
	readonly reporter: Reporter;
}): Promise<void> {
	if (options.emittedFiles.length === 0) {
		options.reporter.debug(
			'createTsBuilder: no emitted TypeScript files to validate.'
		);
		return;
	}

	const summary = await buildGenerationSummary(
		options.emittedFiles,
		options.workspace
	);

	await validateGeneratedImports({
		projectRoot: options.workspace.root,
		summary,
		reporter: options.reporter,
	});
}
