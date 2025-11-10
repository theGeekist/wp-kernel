import type { Command } from 'clipanion';
import type { ReporterOptions } from '@wpkernel/core/reporter';
import type { InitWorkflowOptions } from '../init/workflow';
import { WPKernelError } from '@wpkernel/core/error';
import { createReporterMock } from '@wpkernel/test-utils/cli';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import {
	createInitCommandRuntime,
	formatInitWorkflowError,
	resolveCommandCwd,
} from '../init/command-runtime';
import { getCliPackageRoot } from '../../utils/module-url';

describe('init command runtime helpers', () => {
	it('builds runtime that reuses workspace and reporter when running workflow', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/demo' });
		const reporter = createReporterMock();

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

		expect(runWorkflow).toHaveBeenCalledWith({
			workspace,
			reporter,
			projectName: 'demo',
			template: 'plugin',
			force: true,
			verbose: false,
			preferRegistryVersionsFlag: true,
			env: {
				WPK_PREFER_REGISTRY_VERSIONS: '1',
				REGISTRY_URL: 'https://registry.test',
			},
		});

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
});
