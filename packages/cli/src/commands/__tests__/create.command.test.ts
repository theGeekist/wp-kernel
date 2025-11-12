import path from 'node:path';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { WPKernelError } from '@wpkernel/core/error';
import {
	assignCommandContext,
	createCommandReporterHarness,
} from '@wpkernel/test-utils/cli';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import { buildCreateCommand } from '../create';
import type { buildWorkspace } from '../../workspace/filesystem';
import * as workspaceModule from '../../workspace';

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
				scopes: ['init', 'create'],
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
			key: 'php-driver',
			metadata: { label: 'PHP driver', scopes: ['init', 'create'] },
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

	it('runs init workflow, readiness plan, and installs npm dependencies', async () => {
		const workflow = jest.fn().mockResolvedValue({
			manifest: { writes: [], deletes: [] },
			summaryText: '[wpk] init created plugin scaffold for demo\n',
			summaries: [],
			dependencySource: 'fallback',
			namespace: 'demo',
			templateName: 'plugin',
		});
		const npmInstall = jest.fn().mockResolvedValue(undefined);
		const ensureDirectory = jest.fn().mockResolvedValue(undefined);
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
		});

		const command = new CreateCommand();
		command.name = 'demo';
		command.target = 'demo';
		const { stdout } = assignCommandContext(command, {
			cwd: process.cwd(),
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(workflow).toHaveBeenCalledWith(
			expect.objectContaining({
				workspace,
				projectName: 'demo',
			})
		);
		expect(ensureDirectory).toHaveBeenCalledWith(
			expect.objectContaining({
				workspace,
				directory: path.resolve(process.cwd(), 'demo'),
				force: false,
			})
		);
		expect(npmInstall).toHaveBeenCalledWith(workspace.root);
		expect(readinessPlan).toHaveBeenCalledWith([
			'workspace-hygiene',
			'git',
			'composer',
			'php-runtime',
			'php-driver',
			'php-codemod-ingestion',
			'php-printer-path',
			'tsx-runtime',
		]);
		expect(readinessRun).toHaveBeenCalledTimes(1);
		expect(stdout.toString()).toContain('plugin scaffold');
	});

	it('skips installers when --skip-install is provided', async () => {
		const workflow = jest.fn().mockResolvedValue({
			manifest: { writes: [], deletes: [] },
			summaryText: 'summary\n',
			summaries: [],
			dependencySource: 'fallback',
			namespace: 'demo',
			templateName: 'plugin',
		});
		const npmInstall = jest.fn().mockResolvedValue(undefined);
		const readinessRun = jest.fn().mockResolvedValue({ outcomes: [] });
		const readinessPlan = jest
			.fn()
			.mockImplementation((keys: string[]) => ({
				keys,
				run: readinessRun,
			}));

		const workspace = makeWorkspaceMock({ root: process.cwd() });

		const CreateCommand = buildCreateCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			runWorkflow: workflow,
			installNodeDependencies: npmInstall,
			ensureCleanDirectory: jest.fn().mockResolvedValue(undefined),
			buildReadinessRegistry: (() => ({
				register: jest.fn(),
				plan: readinessPlan,
				describe: () => helperDescriptors,
			})) as never,
			loadWPKernelConfig,
		});

		const command = new CreateCommand();
		command.skipInstall = true;
		const { stdout } = assignCommandContext(command, {
			cwd: process.cwd(),
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(npmInstall).not.toHaveBeenCalled();
		expect(readinessPlan).toHaveBeenCalledWith([
			'workspace-hygiene',
			'git',
			'php-runtime',
			'php-driver',
			'php-codemod-ingestion',
			'php-printer-path',
		]);
		expect(readinessRun).toHaveBeenCalledTimes(1);
		expect(stdout.toString()).toContain('summary');
	});

	it('maps --yes to workspace hygiene readiness overrides', async () => {
		const ensureGeneratedSpy = jest
			.spyOn(workspaceModule, 'ensureGeneratedPhpClean')
			.mockResolvedValue(undefined);
		const workflow = jest.fn().mockResolvedValue({
			manifest: { writes: [], deletes: [] },
			summaryText: 'summary\n',
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

		const workspace = makeWorkspaceMock({ root: process.cwd() });

		const buildReadinessRegistry = jest.fn().mockReturnValue({
			register: jest.fn(),
			plan: readinessPlan,
			describe: () => helperDescriptors,
		});

		const CreateCommand = buildCreateCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			runWorkflow: workflow,
			installNodeDependencies: jest.fn().mockResolvedValue(undefined),
			ensureCleanDirectory: jest.fn().mockResolvedValue(undefined),
			buildReadinessRegistry: buildReadinessRegistry as never,
			loadWPKernelConfig,
		});

		const command = new CreateCommand();
		command.yes = true;
		const { stdout } = assignCommandContext(command, {
			cwd: process.cwd(),
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		const registryOptions = buildReadinessRegistry.mock.calls[0]?.[0];
		expect(
			registryOptions?.helperOverrides?.workspaceHygiene
		).toBeDefined();
		expect(
			typeof registryOptions?.helperOverrides?.workspaceHygiene
				?.ensureClean
		).toBe('function');
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();
		await registryOptions?.helperOverrides?.workspaceHygiene?.ensureClean?.(
			{
				workspace,
				reporter,
			}
		);
		expect(ensureGeneratedSpy).toHaveBeenCalledWith(
			expect.objectContaining({ yes: true })
		);
		expect(stdout.toString()).toContain('summary');

		ensureGeneratedSpy.mockRestore();
	});

	it('passes readiness helper factories from config to the runtime', async () => {
		const customHelperFactory = jest.fn();
		loadWPKernelConfig.mockResolvedValue({
			config: {
				readiness: { helpers: [customHelperFactory] },
			},
			sourcePath: '/workspace/wpk.config.ts',
			configOrigin: 'wpk.config.ts',
			composerCheck: 'ok',
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
			installNodeDependencies: jest.fn().mockResolvedValue(undefined),
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
			'php-driver',
			'php-codemod-ingestion',
			'php-printer-path',
			'tsx-runtime',
			'custom-helper',
		]);
		expect(readinessRun).toHaveBeenCalledTimes(1);
		expect(stdout.toString()).toContain('plugin scaffold');
	});
});
