import path from 'node:path';

import {
	createRecordingReporter,
	makeNoEntry,
	createReadinessTestContext,
	makeWorkspaceMock,
} from '../test-support';

describe('readiness test support utilities', () => {
	it('records reporter output with nested namespaces', () => {
		const { reporter, records } = createRecordingReporter();

		reporter.info('hello');
		reporter.warn('warn', { code: 42 });
		reporter.child('child').error('boom');
		reporter.child('child').debug('trace', { flag: true });

		expect(records).toEqual([
			{
				namespace: '',
				level: 'info',
				message: 'hello',
				context: undefined,
			},
			{
				namespace: '',
				level: 'warn',
				message: 'warn',
				context: { code: 42 },
			},
			{
				namespace: 'child',
				level: 'error',
				message: 'boom',
				context: undefined,
			},
			{
				namespace: 'child',
				level: 'debug',
				message: 'trace',
				context: { flag: true },
			},
		]);
	});

	it('creates readiness contexts with defaults and overrides', () => {
		const context = createReadinessTestContext({
			namespace: 'cli.test',
			workspaceRoot: '/tmp/root',
			cwd: '/tmp/cwd',
			projectRoot: '/project',
		});

		expect(context.environment).toEqual({
			cwd: '/tmp/cwd',
			projectRoot: '/project',
			workspaceRoot: '/tmp/root',
			allowDirty: false,
		});
		expect(context.reporter.child).toBeDefined();
	});

	it('honours the allowDirty override', () => {
		const context = createReadinessTestContext({
			workspaceRoot: '/tmp/root',
			allowDirty: true,
		});

		expect(context.environment.allowDirty).toBe(true);
	});

	it('uses shared workspace mocks for readiness contexts', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/workspace' });
		const context = createReadinessTestContext({ workspace });

		expect(context.environment.workspaceRoot).toBe('/tmp/workspace');
		expect(workspace.resolve('file.ts')).toBe(
			path.join('/tmp/workspace', 'file.ts')
		);
		const { result, manifest } = await workspace.dryRun(
			async () => 'value'
		);
		expect(result).toBe('value');
		expect(manifest).toEqual({ writes: [], deletes: [] });
	});

	it('creates ENOENT errors via makeNoEntry helper', () => {
		const error = makeNoEntry('/missing/file');
		expect(error).toBeInstanceOf(Error);
		expect(error.code).toBe('ENOENT');
		expect(error.message).toContain('/missing/file');
	});
});
