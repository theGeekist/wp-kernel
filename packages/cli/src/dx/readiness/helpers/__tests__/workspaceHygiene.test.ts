import { createWorkspaceHygieneReadinessHelper } from '../workspaceHygiene';
import { createReadinessTestContext } from '@cli-tests/readiness.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';

describe('createWorkspaceHygieneReadinessHelper', () => {
	it('blocks detection without workspace', async () => {
		const helper = createWorkspaceHygieneReadinessHelper({
			readGitStatus: jest.fn(),
		});
		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);
		expect(detection.status).toBe('blocked');
	});

	it('skips hygiene when git repository is missing', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/project' });
		const helper = createWorkspaceHygieneReadinessHelper({
			readGitStatus: jest.fn().mockResolvedValue(null),
		});

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');
		expect(detection.message).toContain('Git repository not detected');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(confirmation.message).toContain('git repository not detected');
	});

	it('confirms clean workspace', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/project' });
		const helper = createWorkspaceHygieneReadinessHelper({
			readGitStatus: jest.fn().mockResolvedValue([]),
		});

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');
		expect(detection.message).toContain('no pending changes');

		const execution = await helper.execute?.(context, detection.state);
		expect(execution?.state.gitStatus).toEqual([]);

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(confirmation.message).toContain('completed');
	});

	it('throws EnvironmentalError for dirty workspace without allowDirty', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/project' });
		const helper = createWorkspaceHygieneReadinessHelper({
			readGitStatus: jest
				.fn()
				.mockResolvedValue([
					{ code: '??', path: 'demo.ts', raw: '?? demo.ts' },
				]),
		});

		const result = await helper.detect(
			createReadinessTestContext({ workspace })
		);

		expect(result.status).toBe('blocked');
		expect(result.message).toContain('Commit, stash');
	});

	it('allows dirty workspace when allowDirty flag is set', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/project' });
		const readGitStatus = jest
			.fn()
			.mockResolvedValue([
				{ code: '??', path: 'demo.ts', raw: '?? demo.ts' },
			]);
		const helper = createWorkspaceHygieneReadinessHelper({ readGitStatus });

		const context = createReadinessTestContext({
			workspace,
			allowDirty: true,
		});
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');
		expect(detection.message).toContain('--allow-dirty');

		const execute = await helper.execute?.(context, detection.state);
		expect(execute?.state.gitStatus).toHaveLength(1);

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(confirmation.message).toContain('allowed');
	});

	it('formats plural dirty workspace messages', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/project' });
		const entries = [
			{ code: '??', path: 'first.ts', raw: '?? first.ts' },
			{ code: 'M ', path: 'second.ts', raw: 'M  second.ts' },
		];
		const readGitStatus = jest.fn().mockResolvedValue(entries);
		const helper = createWorkspaceHygieneReadinessHelper({ readGitStatus });

		const context = createReadinessTestContext({
			workspace,
			allowDirty: true,
		});
		const detection = await helper.detect(context);
		expect(detection.message).toContain('pending changes');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.message).toContain('pending changes. (allowed).');
	});
});
