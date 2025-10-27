import { WPKernelError, serializeWPKernelError } from '../index';

describe('serializeWPKernelError', () => {
	it('serializes WPKernelError instances to the canonical JSON shape', () => {
		const error = new WPKernelError('ValidationError', {
			message: 'Missing required field',
			context: {
				field: 'title',
			},
		});

		const serialized = serializeWPKernelError(error);

		expect(serialized).toEqual(error.toJSON());
		expect(JSON.parse(JSON.stringify(serialized))).toMatchObject({
			name: 'WPKernelError',
			code: 'ValidationError',
			message: 'Missing required field',
			context: {
				field: 'title',
			},
		});
	});

	it('supports wrapped non-kernel errors', () => {
		const wrapped = WPKernelError.wrap(new Error('boom'), 'UnknownError', {
			operation: 'contract-test',
		});

		const serialized = serializeWPKernelError(wrapped);

		expect(serialized).toEqual(wrapped.toJSON());
		expect(serialized.context).toEqual({ operation: 'contract-test' });
	});
});
