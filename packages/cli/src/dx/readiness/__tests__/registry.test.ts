import { createReporter } from '@wpkernel/core/reporter';
import { WPKernelError } from '@wpkernel/core/error';
import {
	createReadinessHelper,
	createReadinessRegistry,
	type DxContext,
	type ReadinessDetection,
	type ReadinessConfirmation,
} from '..';

describe('ReadinessRegistry', () => {
	function buildContext(overrides: Partial<DxContext> = {}): DxContext {
		const reporter = createReporter({
			namespace: 'wpk.test.dx',
			level: 'debug',
			enabled: false,
		});

		return {
			reporter,
			workspace: null,
			environment: {
				cwd: process.cwd(),
				projectRoot: process.cwd(),
				workspaceRoot: null,
				flags: { forceSource: false },
			},
			...overrides,
		} satisfies DxContext;
	}

	it('rejects duplicate helper keys', () => {
		const registry = createReadinessRegistry();
		registry.register(
			createReadinessHelper({
				key: 'git',
				async detect(): Promise<ReadinessDetection<null>> {
					return { status: 'ready', state: null };
				},
				async confirm(): Promise<ReadinessConfirmation<null>> {
					return { status: 'ready', state: null };
				},
			})
		);

		expect(() =>
			registry.register(
				createReadinessHelper({
					key: 'git',
					async detect(): Promise<ReadinessDetection<null>> {
						return { status: 'ready', state: null };
					},
					async confirm(): Promise<ReadinessConfirmation<null>> {
						return { status: 'ready', state: null };
					},
				})
			)
		).toThrow(WPKernelError);
	});

	it('runs detection and confirmation for ready helpers', async () => {
		const registry = createReadinessRegistry();
		registry.register(
			createReadinessHelper({
				key: 'git',
				async detect(): Promise<ReadinessDetection<null>> {
					return { status: 'ready', state: null };
				},
				async confirm(): Promise<ReadinessConfirmation<null>> {
					return { status: 'ready', state: null };
				},
			})
		);

		const plan = registry.plan(['git']);
		const result = await plan.run(buildContext());

		expect(result.error).toBeUndefined();
		expect(result.outcomes).toHaveLength(1);
		expect(result.outcomes[0]).toMatchObject({
			key: 'git',
			status: 'ready',
		});
	});

	it('executes pending helpers and marks them as updated', async () => {
		const registry = createReadinessRegistry();
		const executeSpy = jest.fn();

		registry.register(
			createReadinessHelper({
				key: 'git',
				async detect(): Promise<ReadinessDetection<{ count: number }>> {
					return { status: 'pending', state: { count: 0 } };
				},
				async execute(
					_context,
					state
				): Promise<{ state: { count: number } }> {
					executeSpy();
					return { state: { count: state.count + 1 } };
				},
				async confirm(): Promise<
					ReadinessConfirmation<{ count: number }>
				> {
					return { status: 'ready', state: { count: 1 } };
				},
			})
		);

		const plan = registry.plan(['git']);
		const result = await plan.run(buildContext());

		expect(executeSpy).toHaveBeenCalledTimes(1);
		expect(result.error).toBeUndefined();
		expect(result.outcomes[0]).toMatchObject({
			key: 'git',
			status: 'updated',
		});
	});

	it('runs cleanup and rollback when execution fails', async () => {
		const registry = createReadinessRegistry();
		const cleanupSpy = jest.fn();
		const rollbackSpy = jest.fn();

		registry.register(
			createReadinessHelper({
				key: 'git',
				async detect(): Promise<ReadinessDetection<{ count: number }>> {
					return { status: 'pending', state: { count: 0 } };
				},
				async execute(): Promise<{
					state: { count: number };
					cleanup: () => Promise<void>;
				}> {
					return {
						state: { count: 1 },
						cleanup: async () => {
							cleanupSpy();
						},
					};
				},
				async confirm(): Promise<
					ReadinessConfirmation<{ count: number }>
				> {
					throw new Error('boom');
				},
				async rollback(): Promise<void> {
					rollbackSpy();
				},
			})
		);

		const plan = registry.plan(['git']);
		const result = await plan.run(buildContext());

		expect(cleanupSpy).toHaveBeenCalledTimes(1);
		expect(rollbackSpy).toHaveBeenCalledTimes(1);
		expect(result.error).toBeInstanceOf(Error);
		expect(result.outcomes[0]).toMatchObject({
			key: 'git',
			status: 'failed',
		});
	});
});
