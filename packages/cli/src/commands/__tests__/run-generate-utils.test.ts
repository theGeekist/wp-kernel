jest.mock('../../config', () => ({}));
jest.mock('../../ir', () => ({}));
jest.mock('../../printers', () => ({}));
jest.mock('../../utils', () => ({
	FileWriter: class {
		write = jest.fn();
		summarise = jest.fn(() => ({
			counts: { written: 0, unchanged: 0, skipped: 0 },
			entries: [],
		}));
	},
}));
jest.mock('prettier', () => ({ format: jest.fn() }));
jest.mock('@prettier/plugin-php', () => ({}));

import { KernelError } from '@wpkernel/core/contracts';
import { serialiseError } from '../run-generate';

describe('serialiseError', () => {
	it('serialises KernelError instances', () => {
		const error = new KernelError('ValidationError', {
			message: 'Invalid configuration',
			context: { field: 'namespace' },
			data: { expected: 'string' },
		});

		const result = serialiseError(error);

		expect(result).toEqual(error.toJSON());
		expect(result.context).toEqual({ field: 'namespace' });
	});

	it('serialises native Error objects', () => {
		const error = new Error('boom');
		const result = serialiseError(error);

		expect(result).toMatchObject({
			name: 'KernelError',
			code: 'UnknownError',
			message: 'boom',
			data: expect.objectContaining({ originalError: error }),
		});
		expect(result.stack).toEqual(expect.any(String));
	});

	it('wraps non-error values', () => {
		const result = serialiseError('oops');

		expect(result).toMatchObject({
			name: 'KernelError',
			code: 'UnknownError',
			message: 'Unexpected error occurred.',
			data: { value: 'oops' },
		});
		expect(result.stack).toEqual(expect.any(String));
	});
});
