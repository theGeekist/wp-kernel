import { createReadinessHelper, createReadinessRegistry } from '../../dx';
import { runCommandReadiness } from '../readiness';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import { createRecordingReporter } from '../../dx/readiness/test/test-support';

describe('runCommandReadiness', () => {
	it('emits readiness logs through reporter children', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/workspace' });
		const detectionState: { steps: string[] } = { steps: [] };
		const recorder = createRecordingReporter();

		const buildRegistry = () => {
			const registry = createReadinessRegistry();
			registry.register(
				createReadinessHelper({
					key: 'php-driver',
					metadata: { label: 'PHP driver assets' },
					async detect() {
						return {
							status: 'pending',
							message: 'Driver assets missing.',
							state: detectionState,
						};
					},
					async prepare(_context, state) {
						state.steps.push('prepare');
						return { state };
					},
					async confirm() {
						return {
							status: 'ready',
							message: 'Driver ready.',
							state: detectionState,
						};
					},
				})
			);
			return registry;
		};

		await runCommandReadiness({
			buildReadinessRegistry: buildRegistry,
			reporter: recorder.reporter,
			workspace,
			workspaceRoot: workspace.root,
			cwd: workspace.root,
			keys: ['php-driver'],
		});

		expect(recorder.records).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					namespace: 'php-driver.detect',
					level: 'info',
					message: 'Detect phase started.',
				}),
				expect.objectContaining({
					namespace: 'php-driver.detect',
					level: 'warn',
					message: 'Detect phase reported pending readiness.',
				}),
				expect.objectContaining({
					namespace: 'php-driver.prepare',
					level: 'info',
					message: 'Prepare phase started.',
				}),
				expect.objectContaining({
					namespace: 'php-driver.prepare',
					level: 'info',
					message: 'Prepare phase completed.',
				}),
				expect.objectContaining({
					namespace: 'php-driver.confirm',
					level: 'info',
					message: 'Confirm phase started.',
				}),
				expect.objectContaining({
					namespace: 'php-driver.confirm',
					level: 'info',
					message: 'Confirm phase reported ready.',
				}),
				expect.objectContaining({
					namespace: 'php-driver',
					level: 'info',
					message: 'Readiness helper completed.',
				}),
			])
		);
	});
});
