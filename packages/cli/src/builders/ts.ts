import { createHash as buildHash } from 'node:crypto';
import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceConfig } from '@wpkernel/core/resource';
import type { MaybePromise } from '@wpkernel/pipeline';
import type { Project, SourceFile } from 'ts-morph';
import { WPKernelError } from '@wpkernel/core/error';
import type { IRv1 } from '../ir/publicTypes';
import type { WPKernelConfigV1 } from '../config/types';
import { createHelper } from '../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderOutput,
	PipelinePhase,
} from '../runtime/types';
import type { Workspace } from '../workspace/types';
import { validateGeneratedImports } from '../commands/run-generate/validation';
import type { GenerationSummary } from '../commands/run-generate/types';
import { loadTsMorph } from './ts/loader';
import {
	buildModuleSpecifier,
	resolveKernelImport,
	resolveResourceImport,
	toCamelCase,
	toPascalCase,
} from './ts/shared';
const GENERATED_ROOT = '.generated';

/**
 * Options for emitting a TypeScript file.
 *
 * @category TypeScript Builder
 */
export interface TsBuilderEmitOptions {
	/** The file path where the TypeScript file will be emitted. */
	readonly filePath: string;
	/** The `ts-morph` SourceFile object to emit. */
	readonly sourceFile: SourceFile;
}

/**
 * Defines lifecycle hooks for the TypeScript builder.
 *
 * These hooks allow for custom logic to be executed at different stages
 * of the TypeScript artifact generation process.
 *
 * @category TypeScript Builder
 */
export interface TsBuilderLifecycleHooks {
	/** Hook executed before a creator generates an artifact. */
	readonly onBeforeCreate?: (
		context: Omit<TsBuilderCreatorContext, 'hooks'>
	) => Promise<void>;
	/** Hook executed after a creator generates an artifact. */
	readonly onAfterCreate?: (
		context: Omit<TsBuilderCreatorContext, 'hooks'>
	) => Promise<void>;
	/** Hook executed after all TypeScript files have been emitted. */
	readonly onAfterEmit?: (
		options: TsBuilderAfterEmitOptions
	) => Promise<void>;
}

/**
 * Options passed to the `onAfterEmit` lifecycle hook.
 *
 * @category TypeScript Builder
 */
export interface TsBuilderAfterEmitOptions {
	/** A list of file paths that were emitted. */
	readonly emitted: readonly string[];
	/** The workspace instance. */
	readonly workspace: Workspace;
	/** The reporter instance. */
	readonly reporter: Reporter;
}

/**
 * Context provided to a `TsBuilderCreator` function.
 *
 * @category TypeScript Builder
 */
export interface TsBuilderCreatorContext {
	/** The `ts-morph` project instance for managing source files. */
	readonly project: Project;
	/** The workspace instance. */
	readonly workspace: Workspace;
	/** The resource descriptor for which artifacts are being created. */
	readonly descriptor: ResourceDescriptor;
	/** The full WP Kernel configuration. */
	readonly config: WPKernelConfigV1;
	/** The source path of the configuration file. */
	readonly sourcePath: string;
	/** The Intermediate Representation (IR) of the project. */
	readonly ir: IRv1;
	/** The reporter instance for logging. */
	readonly reporter: Reporter;
	/** A function to emit a generated TypeScript file. */
	readonly emit: (options: TsBuilderEmitOptions) => Promise<void>;
}

/**
 * Defines a creator function for generating TypeScript artifacts.
 *
 * A creator is responsible for generating specific TypeScript files or code
 * based on the provided context.
 *
 * @category TypeScript Builder
 */
export interface TsBuilderCreator {
	/** A unique key for the creator. */
	readonly key: string;
	/** The function that creates the TypeScript artifact. */
	create: (context: TsBuilderCreatorContext) => Promise<void>;
}

/**
 * Options for creating a TypeScript builder.
 *
 * @category TypeScript Builder
 * @public
 */
export interface CreateTsBuilderOptions {
	/** Optional: A list of `TsBuilderCreator` instances to use. */
	readonly creators?: readonly TsBuilderCreator[];
	/** Optional: A factory function to create a `ts-morph` Project instance. */
	readonly projectFactory?: () => MaybePromise<Project>;
	/** Optional: Lifecycle hooks for the builder. */
	readonly hooks?: TsBuilderLifecycleHooks;
}

/**
 * Options for formatting a TypeScript file.
 *
 * @category TypeScript Builder
 */
export interface TsFormatterFormatOptions {
	/** The file path of the TypeScript file to format. */
	readonly filePath: string;
	/** The content of the TypeScript file to format. */
	readonly contents: string;
}

/**
 * Interface for a TypeScript formatter.
 *
 * @category TypeScript Builder
 */
export interface TsFormatter {
	/** Formats the given TypeScript file content. */
	format: (options: TsFormatterFormatOptions) => Promise<string>;
}

/**
 * Options for building a TypeScript formatter.
 *
 * @category TypeScript Builder
 */
export interface BuildTsFormatterOptions {
	/** Optional: A factory function to create a `ts-morph` Project instance. */
	readonly projectFactory?: () => MaybePromise<Project>;
}

type ResourceUiConfig = NonNullable<ResourceConfig['ui']>;
type ResourceAdminConfig = NonNullable<ResourceUiConfig['admin']>;
type AdminDataViews = NonNullable<ResourceAdminConfig['dataviews']>;

/**
 * Describes a resource with its associated configuration and dataviews.
 *
 * @category TypeScript Builder
 */
export interface ResourceDescriptor {
	/** The unique key of the resource. */
	readonly key: string;
	/** The name of the resource. */
	readonly name: string;
	/** The configuration object for the resource. */
	readonly config: ResourceConfig;
	/** The admin dataviews configuration for the resource. */
	readonly dataviews: AdminDataViews;
}

/**
 * Creates a builder helper for generating TypeScript artifacts.
 *
 * This helper orchestrates the generation of various TypeScript files,
 * such as admin screens and dataview fixtures, based on the project's IR.
 * It uses `ts-morph` for programmatic TypeScript code generation and formatting.
 *
 * @category TypeScript Builder
 * @param    options - Options for configuring the TypeScript builder.
 * @returns A `BuilderHelper` instance configured to generate TypeScript artifacts.
 */
export function createTsBuilder(
	options: CreateTsBuilderOptions = {}
): BuilderHelper {
	const creators = options.creators?.slice() ?? [
		buildAdminScreenCreator(),
		buildDataViewFixtureCreator(),
		buildDataViewRegistryCreator(),
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

			const project = await Promise.resolve(projectFactory());
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

/**
 * Builds a `TsBuilderCreator` for generating admin screen components.
 *
 * This creator generates a React component for an admin screen, integrating
 * with the `@wpkernel/ui` library to display resource data views.
 *
 * @category TypeScript Builder
 * @returns A `TsBuilderCreator` instance for admin screen generation.
 */
export function buildAdminScreenCreator(): TsBuilderCreator {
	return {
		key: 'builder.generate.ts.adminScreen.core',
		async create(context) {
			const { VariableDeclarationKind } = await loadTsMorph();
			const { descriptor } = context;
			const screenConfig = descriptor.dataviews.screen ?? {};
			const componentName =
				screenConfig.component ??
				`${toPascalCase(descriptor.name)}AdminScreen`;
			const resourceSymbol =
				screenConfig.resourceSymbol ?? toCamelCase(descriptor.name);
			const wpkernelSymbol = screenConfig.wpkernelSymbol ?? 'kernel';

			const screenDir = path.join(
				GENERATED_ROOT,
				'ui',
				'app',
				descriptor.name,
				'admin'
			);
			const screenPath = path.join(screenDir, `${componentName}.tsx`);

			const [resourceImport, wpkernelImport] = await Promise.all([
				resolveResourceImport({
					workspace: context.workspace,
					from: screenPath,
					configured: screenConfig.resourceImport,
					resourceKey: descriptor.key,
				}),
				resolveKernelImport({
					workspace: context.workspace,
					from: screenPath,
					configured: screenConfig.wpkernelImport,
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
				moduleSpecifier: wpkernelImport,
				namedImports: [{ name: wpkernelSymbol }],
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
						`const runtime = ${wpkernelSymbol}.getUIRuntime?.();`
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

/**
 * Builds a `TsBuilderCreator` for generating dataview fixture files.
 *
 * This creator generates a TypeScript file that exports the dataview
 * configuration for a resource, making it available for testing and development.
 *
 * @category TypeScript Builder
 * @returns A `TsBuilderCreator` instance for dataview fixture generation.
 */
export function buildDataViewFixtureCreator(): TsBuilderCreator {
	return {
		key: 'builder.generate.ts.dataviewFixture.core',
		async create(context) {
			const { VariableDeclarationKind } = await loadTsMorph();
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

/**
 * Builds a `TsBuilderCreator` for generating DataViews registry metadata.
 *
 * This creator emits a TypeScript module describing the auto-registration
 * metadata for a resource so tests and tooling can import the registry
 * snapshot emitted during generation.
 *
 * @category TypeScript Builder
 * @returns A `TsBuilderCreator` instance for registry metadata generation.
 */
export function buildDataViewRegistryCreator(): TsBuilderCreator {
	return {
		key: 'builder.generate.ts.dataviewRegistry.core',
		async create(context) {
			const { VariableDeclarationKind } = await loadTsMorph();
			const { descriptor } = context;
			const registryPath = path.join(
				GENERATED_ROOT,
				'ui',
				'registry',
				'dataviews',
				`${descriptor.key}.ts`
			);
			const configImport = buildModuleSpecifier({
				workspace: context.workspace,
				from: registryPath,
				target: context.sourcePath,
			});
			const identifier = `${toCamelCase(
				descriptor.name
			)}DataViewRegistryEntry`;
			const preferencesKey =
				descriptor.dataviews.preferencesKey ??
				`${context.ir.meta.namespace}/dataviews/${descriptor.name}`;

			const sourceFile = context.project.createSourceFile(
				registryPath,
				'',
				{ overwrite: true }
			);

			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/ui/dataviews',
				namedImports: [
					{
						name: 'DataViewRegistryEntry',
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
						type: 'DataViewRegistryEntry',
						initializer: (writer) => {
							writer.writeLine('{');
							writer.indent(() => {
								writer.write('resource: ');
								writer.quote(descriptor.name);
								writer.writeLine(',');
								writer.write('preferencesKey: ');
								writer.quote(preferencesKey);
								writer.writeLine(',');
								writer.write('metadata: ');
								writer.write(
									`wpkConfigModule.wpkConfig.resources[${JSON.stringify(
										descriptor.key
									)}].ui!.admin!.dataviews as unknown as Record<string, unknown>`
								);
								writer.writeLine(',');
							});
							writer.write('}');
						},
					},
				],
			});

			await context.emit({
				filePath: registryPath,
				sourceFile,
			});
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

async function buildProject(): Promise<Project> {
	const { Project, IndentationText, QuoteKind, NewLineKind } =
		await loadTsMorph();

	return new Project({
		useInMemoryFileSystem: true,
		manipulationSettings: {
			indentationText: IndentationText.TwoSpaces,
			quoteKind: QuoteKind.Single,
			newLineKind: NewLineKind.LineFeed,
		},
	});
}

/**
 * Builds a TypeScript formatter instance.
 *
 * This function creates a `TsFormatter` that can be used to format TypeScript
 * code using `ts-morph`'s built-in formatting capabilities.
 *
 * @category TypeScript Builder
 * @param    options - Options for building the formatter.
 * @returns A `TsFormatter` instance.
 */
export function buildTsFormatter(
	options: BuildTsFormatterOptions = {}
): TsFormatter {
	const projectFactory = options.projectFactory ?? buildProject;

	async function format(
		formatOptions: TsFormatterFormatOptions
	): Promise<string> {
		const project = await Promise.resolve(projectFactory());
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
