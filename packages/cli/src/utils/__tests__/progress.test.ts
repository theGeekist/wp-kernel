import { runWithProgress, measureStageWithProgress } from '../progress';
import { createReporterMock, type ReporterMock } from '@cli-tests/reporter';

jest.useFakeTimers();

jest.mock('../../commands/init/timing', () => ({
	measureStage: jest.fn(async ({ run }: { run: () => Promise<void> }) => {
		await run();
		return { durationMs: 25, budgetMs: 100 };
	}),
}));

const { measureStage } = jest.requireMock('../../commands/init/timing');

describe('progress utilities', () => {
	let reporter: ReporterMock;

	beforeEach(() => {
		reporter = createReporterMock();
	});

	afterEach(() => {
		jest.clearAllTimers();
	});

	it('emits spinner ticks and success message', async () => {
		let resolveRun!: (value: string) => void;
		const runPromise = new Promise<string>((resolve) => {
			resolveRun = resolve;
		});

		const promise = runWithProgress({
			reporter,
			label: 'Installing npm dependencies',
			detail: 'demo',
			intervalMs: 10,
			run: () => runPromise,
			successMessage: (durationMs, value) =>
				`✓ finished in ${durationMs}ms (${value})`,
		});

		jest.advanceTimersByTime(15);
		resolveRun('ok');
		await promise;

		expect(reporter.info).toHaveBeenCalledWith(
			'Installing npm dependencies (demo)...'
		);
		expect(
			(reporter.info as jest.Mock).mock.calls.some(
				([message]: [string]) => message.includes('✓ finished in')
			)
		).toBe(true);
	});

	it('logs error message when the operation fails', async () => {
		const error = new Error('boom');

		await expect(
			runWithProgress({
				reporter,
				label: 'Applying patches',
				intervalMs: 10,
				run: () => {
					throw error;
				},
			})
		).rejects.toThrow('boom');

		expect(reporter.error).toHaveBeenCalledWith(
			expect.stringContaining('failed'),
			{ error }
		);
	});

	it('wraps measureStage with progress logging', async () => {
		const runMock = jest.fn().mockResolvedValue(undefined);

		const measurement = await measureStageWithProgress({
			reporter,
			label: 'Installing composer dependencies',
			stage: 'init.install.composer',
			budgetMs: 200,
			run: runMock,
		});

		expect(measureStage).toHaveBeenCalledWith(
			expect.objectContaining({
				stage: 'init.install.composer',
				label: 'Installing composer dependencies',
				budgetMs: 200,
				logCompletion: false,
			})
		);
		expect(runMock).toHaveBeenCalledTimes(1);
		expect(measurement).toEqual({ durationMs: 25, budgetMs: 100 });
	});
});
