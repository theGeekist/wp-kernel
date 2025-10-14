import { KernelError, serializeKernelError } from '../index';

describe('serializeKernelError', () => {
	it('serializes KernelError instances to the canonical JSON shape', () => {
		const error = new KernelError('ValidationError', {
			message: 'Missing required field',
			context: {
				field: 'title',
			},
		});

		const serialized = serializeKernelError(error);

		expect(serialized).toEqual(error.toJSON());
		expect(JSON.parse(JSON.stringify(serialized))).toMatchObject({
			name: 'KernelError',
			code: 'ValidationError',
			message: 'Missing required field',
			context: {
				field: 'title',
			},
		});
	});

	it('supports wrapped non-kernel errors', () => {
		const wrapped = KernelError.wrap(new Error('boom'), 'UnknownError', {
			operation: 'contract-test',
		});

		const serialized = serializeKernelError(wrapped);

		expect(serialized).toEqual(wrapped.toJSON());
		expect(serialized.context).toEqual({ operation: 'contract-test' });
	});
});
