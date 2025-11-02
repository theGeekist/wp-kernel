import path from 'node:path';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { WPKernelError } from '@wpkernel/core/error';
import {
	assignCommandContext,
	createReporterMock,
} from '@wpkernel/test-utils/cli';
import {
	buildGenerateCommand,
	type BuildGenerateCommandOptions,
} from '../generate';
import { PATCH_MANIFEST_PATH } from '../apply/constants';
import type {
	Pipeline,
	PipelineRunOptions,
	PipelineRunResult,
} from '../../next/runtime';

function buildIrArtifact(workspaceRoot: string): PipelineRunResult['ir'] {
	return {
		meta: {
			version: 1,
			namespace: 'Demo',
			sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
			origin: 'typescript',
			sanitizedNamespace: 'Demo',
		},
		config: {
			version: 1,
			namespace: 'Demo',
			resources: {},
			schemas: {},
		},
		schemas: [],
		resources: [],
		capabilities: [],
		capabilityMap: {
			definitions: [],
			fallback: { capability: 'manage_options', appliesTo: 'resource' },
			missing: [],
			unused: [],
			warnings: [],
		},
		blocks: [],
		php: {
			namespace: 'Demo',
			autoload: 'inc',
			outputDir: '.generated/php',
		},
		diagnostics: [],
	} satisfies PipelineRunResult['ir'];
}

function createWorkspaceStub() {
	const root = path.join(process.cwd(), 'workspace');
	const files = new Map<string, Buffer>();

	const resolvePath = (file: string) =>
		path.isAbsolute(file) ? file : path.resolve(root, file);

	return {
		root,
		cwd: () => root,
		resolve: (...parts: string[]) => path.resolve(root, ...parts),
		read: jest.fn(
			async (file: string) => files.get(resolvePath(file)) ?? null
		),
		readText: jest.fn(async (file: string) => {
			const buffer = files.get(resolvePath(file));
			return buffer ? buffer.toString('utf8') : null;
		}),
		write: jest.fn(async (file: string, data: Buffer | string) => {
			const buffer = Buffer.isBuffer(data)
				? Buffer.from(data)
				: Buffer.from(data, 'utf8');
			files.set(resolvePath(file), buffer);
		}),
		writeJson: jest.fn(
			async (
				file: string,
				value: unknown,
				options?: { pretty?: boolean }
			) => {
				const spacing = options?.pretty ? 2 : undefined;
				const serialised = JSON.stringify(value, null, spacing);
				files.set(resolvePath(file), Buffer.from(serialised, 'utf8'));
			}
		),
		exists: jest.fn(async (file: string) => files.has(resolvePath(file))),
		rm: jest.fn(async () => undefined),
		glob: jest.fn(async () => [] as string[]),
		threeWayMerge: jest.fn(async () => 'clean' as const),
		begin: jest.fn(),
		commit: jest.fn(async () => ({
			writes: [] as string[],
			deletes: [] as string[],
		})),
		rollback: jest.fn(async () => ({
			writes: [] as string[],
			deletes: [] as string[],
		})),
		dryRun: jest.fn(async (fn: () => Promise<unknown>) => ({
			result: await fn(),
			manifest: { writes: [] as string[], deletes: [] as string[] },
		})),
		tmpDir: jest.fn(async () => path.join(root, '.tmp', 'workspace')),
	};
}

function createPipelineStub(
	_workspace: ReturnType<typeof createWorkspaceStub>,
	runImpl?: (options: PipelineRunOptions) => Promise<PipelineRunResult>
): { pipeline: Pipeline; runMock: jest.Mock } {
	const runMock = jest.fn(async (options: PipelineRunOptions) => {
		await options.workspace.write(
			path.join('.generated', 'index.ts'),
			"console.log('hello world');\n"
		);
		await options.workspace.write(PATCH_MANIFEST_PATH, '{}');

		return {
			ir: buildIrArtifact(options.workspace.root),
			diagnostics: [],
			steps: [],
		} satisfies PipelineRunResult;
	});

	const executor = runImpl ? jest.fn(runImpl) : runMock;

	const pipeline = {
		ir: { use: jest.fn() },
		builders: { use: jest.fn() },
		extensions: { use: jest.fn() },
		use: jest.fn(),
		run: executor as unknown as Pipeline['run'],
	} as Pipeline;

	return { pipeline, runMock: executor };
}

describe('NextGenerateCommand', () => {
	it('runs the pipeline and writes the summary output', async () => {
		const workspace = createWorkspaceStub();
		const { pipeline, runMock } = createPipelineStub(workspace);
		const reporter = createReporterMock();

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const renderSummary = jest.fn().mockReturnValue('summary output\n');
		const validateGeneratedImports = jest.fn().mockResolvedValue(undefined);

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary,
			validateGeneratedImports,
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		const { stdout } = assignCommandContext(command, {
			cwd: workspace.root,
		});

		command.dryRun = false;
		command.verbose = false;

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(runMock).toHaveBeenCalled();
		expect(workspace.begin).toHaveBeenCalledWith('generate');
		expect(workspace.commit).toHaveBeenCalledWith('generate');
		expect(workspace.rollback).not.toHaveBeenCalledWith('generate');
		expect(renderSummary).toHaveBeenCalledWith(
			expect.objectContaining({ counts: expect.any(Object) }),
			false,
			false
		);
		expect(validateGeneratedImports).toHaveBeenCalledWith(
			expect.objectContaining({
				summary: expect.objectContaining({ dryRun: false }),
			})
		);
		expect(stdout.toString()).toBe('summary output\n');
		expect(command.summary).toEqual(
			expect.objectContaining({
				dryRun: false,
				entries: expect.arrayContaining([
					expect.objectContaining({
						path: expect.stringContaining('.generated/index.ts'),
						status: 'written',
					}),
				]),
			})
		);
	});

	it('rolls back workspace changes during dry-run', async () => {
		const workspace = createWorkspaceStub();
		const { pipeline, runMock } = createPipelineStub(workspace);
		const reporter = createReporterMock();

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const renderSummary = jest.fn().mockReturnValue('dry-run summary\n');
		const validateGeneratedImports = jest.fn().mockResolvedValue(undefined);

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary,
			validateGeneratedImports,
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		const { stdout } = assignCommandContext(command, {
			cwd: workspace.root,
		});

		command.dryRun = true;
		command.verbose = false;

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(runMock).toHaveBeenCalled();
		expect(workspace.rollback).toHaveBeenCalledWith('generate');
		expect(workspace.commit).not.toHaveBeenCalledWith('generate');
		expect(validateGeneratedImports).toHaveBeenCalledWith(
			expect.objectContaining({
				summary: expect.objectContaining({ dryRun: true }),
			})
		);
		expect(command.summary).toEqual(
			expect.objectContaining({
				dryRun: true,
				entries: expect.arrayContaining([
					expect.objectContaining({
						status: 'skipped',
						reason: 'dry-run',
					}),
				]),
			})
		);
		expect(stdout.toString()).toBe('dry-run summary\n');
	});

	it('warns when diagnostics are emitted by the pipeline', async () => {
		const workspace = createWorkspaceStub();
		const reporter = createReporterMock();

		const { pipeline } = createPipelineStub(workspace, async (options) => {
			await options.workspace.write(
				path.join('.generated', 'index.ts'),
				'file contents\n'
			);
			return {
				ir: buildIrArtifact(options.workspace.root),
				diagnostics: [
					{
						type: 'conflict',
						key: 'builder.conflict',
						mode: 'override',
						message: 'conflict detected',
						helpers: ['first', 'second'],
					},
				],
				steps: [],
			} satisfies PipelineRunResult;
		});

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary: jest.fn().mockReturnValue('summary\n'),
			validateGeneratedImports: jest.fn().mockResolvedValue(undefined),
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		assignCommandContext(command, { cwd: workspace.root });

		command.dryRun = false;
		command.verbose = false;

		await command.execute();

		expect(reporter.warn).toHaveBeenCalledWith(
			'Pipeline diagnostic reported.',
			expect.objectContaining({ message: 'conflict detected' })
		);
	});

	it('propagates failures from the pipeline as exit codes', async () => {
		const workspace = createWorkspaceStub();
		const reporter = createReporterMock();

		const { pipeline } = createPipelineStub(workspace, async () => {
			throw new WPKernelError('ValidationError', {
				message: 'pipeline failed',
			});
		});

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary: jest.fn().mockReturnValue('summary\n'),
			validateGeneratedImports: jest.fn().mockResolvedValue(undefined),
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		assignCommandContext(command, { cwd: workspace.root });

		command.dryRun = false;
		command.verbose = false;

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
		expect(workspace.rollback).toHaveBeenCalledWith('generate');
		expect(reporter.error).toHaveBeenCalled();
		expect(command.summary).toBeNull();
	});

	it('fails when the apply manifest is missing after generation', async () => {
		const workspace = createWorkspaceStub();
		workspace.exists = jest.fn(async () => false);

		const { pipeline } = createPipelineStub(workspace);
		const reporter = createReporterMock();

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const renderSummary = jest.fn().mockReturnValue('summary output\n');
		const validateGeneratedImports = jest.fn().mockResolvedValue(undefined);

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary,
			validateGeneratedImports,
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		const { stdout } = assignCommandContext(command, {
			cwd: workspace.root,
		});

		command.dryRun = false;
		command.verbose = false;

		const stderrSpy = jest
			.spyOn(process.stderr, 'write')
			.mockImplementation(() => true as unknown as number);

		const exitCode = await command.execute();

		stderrSpy.mockRestore();

		expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(stdout.toString()).toBe('');
		expect(reporter.error).toHaveBeenCalledWith(
			'Failed to locate apply manifest after generation.',
			expect.objectContaining({
				manifestPath: PATCH_MANIFEST_PATH,
				workspace: workspace.root,
			})
		);
		expect(validateGeneratedImports).not.toHaveBeenCalled();
	});
});
