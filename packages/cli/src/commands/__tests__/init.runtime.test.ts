import type { Command } from 'clipanion';
import type { ReporterOptions } from '@wpkernel/core/reporter';
import type { InitWorkflowOptions } from '../init/types';
import type { ReadinessRegistry } from '../../dx';
import { WPKernelError } from '@wpkernel/core/error';
import { createCommandReporterHarness } from '@wpkernel/test-utils/cli';
import { makeWorkspaceMock } from '@wpkernel/test-utils/workspace.test-support';
import {
	createInitCommandRuntime,
	formatInitWorkflowError,
	resolveCommandCwd,
} from '../init/command-runtime';
import { getCliPackageRoot } from '../../utils/module-url';

describe('init command runtime helpers', () => {
	it('builds runtime that reuses workspace and reporter when running workflow', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/demo' });
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();

		const buildWorkspace = jest.fn((root: string) => {
			expect(root).toBe(workspace.root);
			return workspace;
		});
		const buildReporter = jest.fn((options: ReporterOptions) => {
			expect(options.namespace).toBe('wpk.cli.test');
			return reporter;
		});
		const runWorkflow = jest
			.fn((options: InitWorkflowOptions) => {
				expect(options.workspace).toBe(workspace);
				expect(options.reporter).toBe(reporter);
				return Promise.resolve({
					manifest: { writes: [], deletes: [] },
					summaryText: 'summary\n',
					summaries: [],
					dependencySource: 'fallback',
					namespace: 'demo',
					templateName: 'plugin',
				});
			})
			.mockName('runWorkflow');

		const runtime = createInitCommandRuntime(
			{ buildWorkspace, buildReporter, runWorkflow },
			{
				reporterNamespace: 'wpk.cli.test',
				reporterEnabled: true,
				workspaceRoot: workspace.root,
				cwd: workspace.root,
				projectName: 'demo',
				template: 'plugin',
				force: true,
				verbose: false,
				preferRegistryVersions: true,
				env: {
					WPK_PREFER_REGISTRY_VERSIONS: '1',
					REGISTRY_URL: 'https://registry.test',
				},
			}
		);

		expect(runtime.workspace).toBe(workspace);
		expect(runtime.reporter).toBe(reporter);
		expect(runtime.resolved).toEqual(
			expect.objectContaining({
				projectName: 'demo',
				template: 'plugin',
				force: true,
				verbose: false,
				preferRegistryVersions: true,
			})
		);

		await runtime.runWorkflow();

		expect(runWorkflow).toHaveBeenCalledWith(
			expect.objectContaining({
				workspace,
				reporter,
				projectName: 'demo',
				template: 'plugin',
				force: true,
				verbose: false,
				preferRegistryVersionsFlag: true,
				env: expect.objectContaining({
					WPK_PREFER_REGISTRY_VERSIONS: '1',
					REGISTRY_URL: 'https://registry.test',
				}),
			})
		);

		expect(runtime.readiness.registry).toBeDefined();
		expect(runtime.readiness.context.workspace).toBe(workspace);
		expect(runtime.readiness.context.environment.cwd).toBe(workspace.root);
		expect(runtime.readiness.context.environment.workspaceRoot).toBe(
			workspace.root
		);
		expect(runtime.readiness.context.environment.projectRoot).toBe(
			getCliPackageRoot()
		);
		expect(runtime.readiness.defaultKeys.length).toBeGreaterThan(0);
		expect(() => runtime.readiness.plan([])).not.toThrow();
	});

	it('includes helpers scoped only to create when deriving default readiness keys', () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/create-only' });
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();

		const buildWorkspace = jest.fn(() => workspace);
		const buildReporter = jest.fn(() => reporter);
		const runWorkflow = jest.fn();

		const describe = jest.fn(() => [
			{
				key: 'init-only',
				metadata: { label: 'Init helper', scopes: ['init'] },
			},
			{
				key: 'create-only',
				metadata: { label: 'Create helper', scopes: ['create'] },
			},
			{
				key: 'generate-only',
				metadata: { label: 'Generate helper', scopes: ['generate'] },
			},
			{
				key: 'global-helper',
				metadata: { label: 'Global helper' },
			},
		]);

		const plan = jest.fn((keys: readonly string[]) => ({
			keys: [...keys],
			run: jest.fn(async () => ({ outcomes: [] })),
		}));

		const runtime = createInitCommandRuntime(
			{
				buildWorkspace,
				buildReporter,
				runWorkflow,
				buildReadinessRegistry: () =>
					({ describe, plan }) as unknown as ReadinessRegistry,
			},
			{
				reporterNamespace: 'wpk.cli.test',
				workspaceRoot: workspace.root,
			}
		);

		expect(runtime.readiness.defaultKeys).toEqual([
			'init-only',
			'create-only',
			'global-helper',
		]);
	});

	it('formats wpk errors consistently for init workflow consumers', () => {
		const error = new WPKernelError('ValidationError', {
			message: 'Failed to write files.',
			data: {
				collisions: ['wpk.config.ts', 'src/index.ts'],
				path: 'src/index.ts',
			},
		});

		const message = formatInitWorkflowError('create', error);

		expect(message).toContain(
			'[wpk] create failed: Failed to write files.'
		);
		expect(message).toContain('Conflicting files:');
		expect(message).toContain('  - wpk.config.ts');
		expect(message).toContain('  - src/index.ts');
	});

	it('resolves the command cwd from clipanion context when provided', () => {
		const context = { cwd: () => '/tmp/context-root' } as const;
		expect(
			resolveCommandCwd(context as unknown as Command['context'])
		).toBe('/tmp/context-root');
	});

	it('prefers package manager flag, falling back to env configuration', () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/package-manager' });
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();

		const buildWorkspace = jest.fn(() => workspace);
		const buildReporter = jest.fn(() => reporter);
		const runWorkflow = jest.fn();

		const runtime = createInitCommandRuntime(
			{ buildWorkspace, buildReporter, runWorkflow },
			{
				reporterNamespace: 'wpk.cli.test',
				workspaceRoot: workspace.root,
				env: {
					WPK_PACKAGE_MANAGER: 'pnpm',
				},
			}
		);

		expect(runtime.resolved.packageManager).toBe('pnpm');
		expect(runtime.workflowOptions.packageManager).toBe('pnpm');
	});

	it('falls back to process env when no option or env override is provided', () => {
		const workspace = makeWorkspaceMock({
			root: '/tmp/package-manager-env',
		});
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();

		const buildWorkspace = jest.fn(() => workspace);
		const buildReporter = jest.fn(() => reporter);
		const runWorkflow = jest.fn();

		const original = process.env.WPK_PACKAGE_MANAGER;
		process.env.WPK_PACKAGE_MANAGER = 'yarn';

		const runtime = createInitCommandRuntime(
			{ buildWorkspace, buildReporter, runWorkflow },
			{
				reporterNamespace: 'wpk.cli.test',
				workspaceRoot: workspace.root,
			}
		);

		expect(runtime.resolved.packageManager).toBe('yarn');
		expect(runtime.workflowOptions.packageManager).toBe('yarn');

		process.env.WPK_PACKAGE_MANAGER = original;
	});
});
