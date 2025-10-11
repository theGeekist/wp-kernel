import { KernelError } from '@geekist/wp-kernel/error';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import { normalizeActionError } from '../error-utils';

describe('normalizeActionError', () => {
	const context = {
		actionId: 'delete',
		resource: 'jobs',
		selection: ['1'],
	};

	function createReporter(): Reporter {
		return {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			child: jest.fn(),
		} as unknown as Reporter;
	}

	it('wraps validation errors as DataViewsActionError', () => {
		const reporter = createReporter();
		const original = new KernelError('ValidationError', {
			message: 'Invalid input',
			context: { field: 'title' },
		});

		const normalized = normalizeActionError(original, context, reporter);

		expect(normalized).not.toBe(original);
		expect(normalized).toBeInstanceOf(KernelError);
		expect(normalized.code).toBe('ValidationError');
		expect(normalized.context).toEqual(
			expect.objectContaining({ actionId: 'delete', resource: 'jobs' })
		);
	});

	it('maps policy denied errors with default message', () => {
		const reporter = createReporter();
		const denied = new KernelError('PolicyDenied', {
			context: { policyKey: 'jobs.delete' },
		});
		denied.message = '';

		const normalized = normalizeActionError(denied, context, reporter);

		expect(normalized.code).toBe('ValidationError');
		expect(normalized.message).toBe('Action not permitted');
		expect(normalized.context).toEqual(
			expect.objectContaining({ policyKey: 'jobs.delete' })
		);
	});

	it('wraps transport errors using KernelError.wrap', () => {
		const reporter = createReporter();
		const transport = new KernelError('TransportError', {
			message: 'Network down',
		});

		const normalized = normalizeActionError(transport, context, reporter);

		expect(normalized.code).toBe('TransportError');
		expect(normalized.context).toEqual(
			expect.objectContaining({ resourceName: 'jobs' })
		);
	});

	it('wraps unknown errors and logs them via reporter', () => {
		const reporter = createReporter();
		const error = new Error('boom');

		const normalized = normalizeActionError(error, context, reporter);

		expect(normalized.code).toBe('UnknownError');
		expect(reporter.error).toHaveBeenCalledWith(
			'Unhandled error thrown by DataViews action',
			expect.objectContaining({ selection: context.selection })
		);
	});

	it('handles non-error values by constructing KernelError', () => {
		const reporter = createReporter();
		const normalized = normalizeActionError('fail', context, reporter);

		expect(normalized).toBeInstanceOf(KernelError);
		expect(normalized.code).toBe('UnknownError');
		expect(reporter.error).toHaveBeenCalledWith(
			'DataViews action failed with non-error value',
			expect.objectContaining({ error: normalized })
		);
	});
});
