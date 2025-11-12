import { WPKernelError } from '@wpkernel/core/error';
import { assertReadinessRun } from '../assertions';
import type { ReadinessOutcome } from '../types';

describe('assertReadinessRun', () => {
	it('returns when readiness run completes without failures', () => {
		expect(() =>
			assertReadinessRun({
				outcomes: [],
			})
		).not.toThrow();
	});

	it('rethrows registry failures reported as WPKernelError', () => {
		const fatal = new WPKernelError('ValidationError', {
			message: 'registry failed',
		});

		expect(() =>
			assertReadinessRun({
				outcomes: [],
				error: fatal,
			})
		).toThrow(fatal);
	});

	it('wraps non-error registry failures as unknown errors', () => {
		expect(() =>
			assertReadinessRun({
				outcomes: [],
				error: 'unexpected',
			})
		).toThrow(
			expect.objectContaining({
				code: 'UnknownError',
			})
		);
	});

	it('wraps failing outcome errors using developer context', () => {
		const failure: ReadinessOutcome = {
			key: 'composer',
			status: 'failed',
			error: new Error('fatal composer failure'),
		};

		expect(() => assertReadinessRun({ outcomes: [failure] })).toThrow(
			expect.objectContaining({
				code: 'DeveloperError',
			})
		);
	});

	it('throws validation failures for blocked helpers', () => {
		const outcome: ReadinessOutcome = {
			key: 'php-runtime',
			status: 'blocked',
		};

		expect(() => assertReadinessRun({ outcomes: [outcome] })).toThrow(
			expect.objectContaining({
				code: 'ValidationError',
			})
		);
	});
});
