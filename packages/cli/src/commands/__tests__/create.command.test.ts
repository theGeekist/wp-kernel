import path from 'node:path';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { WPKernelError } from '@wpkernel/core/error';
import { assignCommandContext } from '@cli-tests/cli';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { buildCreateCommand } from '../create';
import type { buildWorkspace } from '../../workspace/filesystem';
import type { InitWorkflowOptions } from '../init/types';

describe('CreateCommand', () => {
	let loadWPKernelConfig: jest.Mock;

	beforeEach(() => {
		loadWPKernelConfig = jest.fn().mockRejectedValue(
			new WPKernelError('DeveloperError', {
				message:
					'Unable to locate a wpk config. Create wpk.config.ts (or wpk.config.js) or add a "wpk" field to package.json.',
			})
		);
	});

	const helperDescriptors = [
		{
			key: 'workspace-hygiene',
			metadata: {
				label: 'Workspace hygiene',
				scopes: ['init', 'create', 'generate', 'apply'],
			},
		},
		{
			key: 'git',
			metadata: { label: 'Git', scopes: ['init', 'create'] },
		},
		{
			key: 'composer',
			metadata: {
				label: 'Composer',
				scopes: ['init', 'create'],
				tags: ['requires-install'],
			},
		},
		{
			key: 'php-runtime',
			metadata: { label: 'PHP runtime', scopes: ['init', 'create'] },
		},
		{
			key: 'php-codemod-ingestion',
			metadata: {
				label: 'PHP codemod ingestion',
				scopes: ['init', 'create'],
			},
		},
		{
			key: 'php-printer-path',
			metadata: { label: 'PHP printer path', scopes: ['init', 'create'] },
		},
		{
			key: 'tsx-runtime',
			metadata: {
				label: 'TSX runtime',
				scopes: ['init', 'create'],
				tags: ['requires-install'],
			},
		},
	];

	it('runs init workflow, readiness plan, and configures installers', async () => {
		let capturedWorkflowOptions: InitWorkflowOptions | undefined;
		const workflow = jest
			.fn()
			.mockImplementation(async (options: InitWorkflowOptions) => {
				capturedWorkflowOptions = options;
				return {
					manifest: { writes: [], deletes: [] },
					summaryText:
						'[wpk] init created plugin scaffold for demo\n',
					summaries: [],
					dependencySource: 'fallback',
					namespace: 'demo',
					templateName: 'plugin',
				};
			});
		const npmInstall = jest
			.fn()
			.mockResolvedValue({ stdout: '', stderr: '' });
		const composerInstall = jest.fn().mockResolvedValue(undefined);
		const ensureDirectory = jest.fn().mockResolvedValue(undefined);
		const readinessRun = jest.fn().mockResolvedValue({ outcomes: [] });
		let capturedContext: unknown;
		const readinessPlan = jest
			.fn()
			.mockImplementation((keys: string[]) => ({
				keys,
				run: (context: unknown) => {
					capturedContext = context;
					return readinessRun(context);
				},
			}));
		const buildReadinessRegistry = jest.fn().mockReturnValue({
			register: jest.fn(),
			plan: readinessPlan,
			describe: () => helperDescriptors,
		});

		const workspaceRoot = path.join(process.cwd(), 'demo-workspace');
		const workspace = makeWorkspaceMock({ root: workspaceRoot });

		const CreateCommand = buildCreateCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			runWorkflow: workflow,
			installNodeDependencies: npmInstall,
			ensureCleanDirectory: ensureDirectory,
			buildReadinessRegistry: buildReadinessRegistry as never,
			loadWPKernelConfig,
			installComposerDependencies: composerInstall,
		});

		const command = new CreateCommand();
		command.name = 'demo';
		command.target = 'demo';
		const { stdout } = assignCommandContext(command, {
			cwd: process.cwd(),
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(workflow).toHaveBeenCalled();
		expect(ensureDirectory).toHaveBeenCalledWith(
			expect.objectContaining({
				workspace,
				directory: path.resolve(process.cwd(), 'demo'),
				force: false,
			})
		);
		expect(readinessPlan).toHaveBeenCalledWith([
			'workspace-hygiene',
			'git',
			'composer',
			'php-runtime',
			'php-codemod-ingestion',
			'php-printer-path',
			'tsx-runtime',
		]);
		expect(readinessRun).toHaveBeenCalledTimes(1);
		expect(
			(capturedContext as { environment: { allowDirty: boolean } })
				.environment.allowDirty
		).toBe(false);
		expect(stdout.toString()).toContain('plugin scaffold');
		expect(capturedWorkflowOptions?.installDependencies).toBe(true);
		expect(
			capturedWorkflowOptions?.installers?.installNodeDependencies
		).toBe(npmInstall);
		expect(
			capturedWorkflowOptions?.installers?.installComposerDependencies
		).toBe(composerInstall);
	});

	it('propagates --allow-dirty to readiness context', async () => {
		const workflow = jest.fn().mockResolvedValue({
			manifest: { writes: [], deletes: [] },
			summaryText: 'summary\n',
			summaries: [],
			dependencySource: 'fallback',
			namespace: 'demo',
			templateName: 'plugin',
		});
		const readinessRun = jest.fn().mockResolvedValue({ outcomes: [] });
		let capturedContext: unknown;
		const readinessPlan = jest
			.fn()
			.mockImplementation((keys: string[]) => ({
				keys,
				run: (context: unknown) => {
					capturedContext = context;
					return readinessRun(context);
				},
			}));

		const workspace = makeWorkspaceMock({ root: process.cwd() });

		const buildReadinessRegistry = jest.fn().mockReturnValue({
			register: jest.fn(),
			plan: readinessPlan,
			describe: () => helperDescriptors,
		});

		const CreateCommand = buildCreateCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			runWorkflow: workflow,
			installNodeDependencies: jest
				.fn()
				.mockResolvedValue({ stdout: '', stderr: '' }),
			ensureCleanDirectory: jest.fn().mockResolvedValue(undefined),
			buildReadinessRegistry: buildReadinessRegistry as never,
			loadWPKernelConfig,
		});

		const command = new CreateCommand();
		command.allowDirty = true;
		const { stdout } = assignCommandContext(command, {
			cwd: process.cwd(),
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(readinessRun).toHaveBeenCalledTimes(1);
		expect(
			(capturedContext as { environment: { allowDirty: boolean } })
				.environment.allowDirty
		).toBe(true);
		expect(stdout.toString()).toContain('summary');
	});

	it('passes readiness helper factories from config to the runtime', async () => {
		const customHelperFactory = jest.fn();
		loadWPKernelConfig.mockResolvedValue({
			config: {
				readiness: { helpers: [customHelperFactory] },
			},
			sourcePath: '/workspace/wpk.config.ts',
			configOrigin: 'wpk.config.ts',
			namespace: 'demo',
		});

		const workflow = jest.fn().mockResolvedValue({
			manifest: { writes: [], deletes: [] },
			summaryText: '[wpk] init created plugin scaffold for demo\n',
			summaries: [],
			dependencySource: 'fallback',
			namespace: 'demo',
			templateName: 'plugin',
		});
		const readinessRun = jest.fn().mockResolvedValue({ outcomes: [] });
		const readinessPlan = jest
			.fn()
			.mockImplementation((keys: string[]) => ({
				keys,
				run: readinessRun,
			}));
		const buildReadinessRegistry = jest.fn().mockReturnValue({
			register: jest.fn(),
			plan: readinessPlan,
			describe: () => [
				...helperDescriptors,
				{
					key: 'custom-helper',
					metadata: {
						label: 'Custom helper',
						scopes: ['create'],
					},
				},
			],
		});

		const workspace = makeWorkspaceMock({ root: process.cwd() });

		const CreateCommand = buildCreateCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			runWorkflow: workflow,
			installNodeDependencies: jest
				.fn()
				.mockResolvedValue({ stdout: '', stderr: '' }),
			ensureCleanDirectory: jest.fn().mockResolvedValue(undefined),
			buildReadinessRegistry: buildReadinessRegistry as never,
			loadWPKernelConfig,
		});

		const command = new CreateCommand();
		const { stdout } = assignCommandContext(command, {
			cwd: process.cwd(),
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(buildReadinessRegistry).toHaveBeenCalledWith({
			helperFactories: [customHelperFactory],
		});
		expect(readinessPlan).toHaveBeenCalledWith([
			'workspace-hygiene',
			'git',
			'composer',
			'php-runtime',
			'php-codemod-ingestion',
			'php-printer-path',
			'tsx-runtime',
			'custom-helper',
		]);
		expect(readinessRun).toHaveBeenCalledTimes(1);
		expect(stdout.toString()).toContain('plugin scaffold');
	});
});
