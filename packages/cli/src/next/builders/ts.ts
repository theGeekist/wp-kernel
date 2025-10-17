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
import type { IRv1 } from '../../ir/types';
import type { KernelConfigV1 } from '../../config/types';
import { createHelper } from '../helper';
import type { BuilderHelper, BuilderOutput } from '../runtime/types';
import type { Workspace } from '../workspace/types';

const SOURCE_EXTENSIONS = [
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
] as const;
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
	readonly onAfterEmit?: (emitted: readonly string[]) => Promise<void>;
}

export interface TsBuilderCreatorContext {
	readonly project: Project;
	readonly workspace: Workspace;
	readonly descriptor: ResourceDescriptor;
	readonly config: KernelConfigV1;
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
		createAdminScreenCreator(),
		createDataViewFixtureCreator(),
	];
	const projectFactory = options.projectFactory ?? createProject;
	const lifecycleHooks = options.hooks ?? {};

	return createHelper({
		key: 'builder.generate.ts.core',
		kind: 'builder',
		async apply({ context, input, output, reporter }) {
			const emittedFiles: string[] = [];
			const descriptors = collectResourceDescriptors(
				input.options.config.resources
			);

			if (descriptors.length === 0) {
				reporter.debug('createTsBuilder: no resources registered.');
				return;
			}

			const project = projectFactory();
			const emit = createEmitter(context.workspace, output, emittedFiles);

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

			if (lifecycleHooks.onAfterEmit) {
				await lifecycleHooks.onAfterEmit([...emittedFiles]);
			}

			if (emittedFiles.length === 0) {
				reporter.debug(
					'createTsBuilder: generated TypeScript artifacts.'
				);
			} else {
				const previewList = emittedFiles
					.slice(0, 3)
					.map((file) => file.replace(/\\/g, '/'))
					.join(', ');
				const suffix = emittedFiles.length > 3 ? ', …' : '';
				reporter.debug(
					`createTsBuilder: ${emittedFiles.length} files written (${previewList}${suffix})`
				);
			}
		},
	});
}

export function createAdminScreenCreator(): TsBuilderCreator {
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
				namedImports: ['KernelError'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/ui',
				namedImports: ['KernelUIProvider', 'useKernelUI'],
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
					writer.writeLine('const runtime = useKernelUI();');
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
							"throw new KernelError('DeveloperError', {"
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
							'<KernelUIProvider runtime={runtime}>'
						);
						writer.indent(() => {
							writer.writeLine(`<${contentComponentName} />`);
						});
						writer.writeLine('</KernelUIProvider>');
					});
					writer.writeLine(');');
				},
			});

			await context.emit({ filePath: screenPath, sourceFile });
		},
	};
}

export function createDataViewFixtureCreator(): TsBuilderCreator {
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
			const configImport = createModuleSpecifier({
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
				namespaceImport: 'kernelConfigModule',
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
								'kernelConfigModule.kernelConfig.resources['
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

function createProject(): Project {
	return new Project({
		useInMemoryFileSystem: true,
		manipulationSettings: {
			indentationText: IndentationText.TwoSpaces,
			quoteKind: QuoteKind.Single,
			newLineKind: NewLineKind.LineFeed,
		},
	});
}

function createEmitter(
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

async function resolveResourceImport({
	workspace,
	from,
	configured,
	resourceKey,
}: {
	readonly workspace: Workspace;
	readonly from: string;
	readonly configured?: string;
	readonly resourceKey: string;
}): Promise<string> {
	if (configured) {
		return configured;
	}

	const resolved = await findExistingModule(
		workspace,
		path.join('src', 'resources', resourceKey)
	);
	if (resolved) {
		return createModuleSpecifier({ workspace, from, target: resolved });
	}

	return `@/resources/${resourceKey}`;
}

async function resolveKernelImport({
	workspace,
	from,
	configured,
}: {
	readonly workspace: Workspace;
	readonly from: string;
	readonly configured?: string;
}): Promise<string> {
	if (configured) {
		return configured;
	}

	const resolved = await findExistingModule(
		workspace,
		path.join('src', 'bootstrap', 'kernel')
	);
	if (resolved) {
		return createModuleSpecifier({ workspace, from, target: resolved });
	}

	return '@/bootstrap/kernel';
}

async function findExistingModule(
	workspace: Workspace,
	basePath: string
): Promise<string | null> {
	for (const extension of SOURCE_EXTENSIONS) {
		const candidate = `${basePath}${extension}`;
		if (await workspace.exists(candidate)) {
			return candidate;
		}
	}

	return null;
}

function createModuleSpecifier({
	workspace,
	from,
	target,
}: {
	readonly workspace: Workspace;
	readonly from: string;
	readonly target: string;
}): string {
	const fromAbsolute = workspace.resolve(from);
	const targetAbsolute = path.isAbsolute(target)
		? target
		: workspace.resolve(target);
	const workspaceRoot = workspace.resolve('.');
	const relativeToWorkspace = path.relative(workspaceRoot, targetAbsolute);

	if (relativeToWorkspace.startsWith('..')) {
		const aliasTarget = stripExtension(relativeToWorkspace)
			.replace(/^(\.\.[\\/])+/, '')
			.replace(/\\/g, '/');

		const normalisedAlias =
			aliasTarget.length > 0 ? aliasTarget.replace(/^\/+/u, '') : '';

		return normalisedAlias.length > 0 ? `@/${normalisedAlias}` : '@/';
	}

	const relative = path.relative(path.dirname(fromAbsolute), targetAbsolute);
	const withoutExtension = stripExtension(relative);

	return normaliseModuleSpecifier(withoutExtension);
}

function stripExtension(modulePath: string): string {
	for (const extension of SOURCE_EXTENSIONS) {
		if (modulePath.endsWith(extension)) {
			return modulePath.slice(0, -extension.length);
		}
	}

	return modulePath;
}

function normaliseModuleSpecifier(specifier: string): string {
	const normalised = specifier.replace(/\\/g, '/');
	if (normalised.startsWith('.')) {
		return normalised;
	}
	return `./${normalised}`;
}

function toPascalCase(value: string): string {
	return value
		.split(/[^a-zA-Z0-9]+/u)
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join('');
}

function toCamelCase(value: string): string {
	const pascal = toPascalCase(value);
	if (pascal.length === 0) {
		return pascal;
	}
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
