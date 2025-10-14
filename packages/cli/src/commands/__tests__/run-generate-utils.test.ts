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

import { KernelError } from '@wpkernel/core/error';
import { serialiseError } from '../run-generate';

describe('serialiseError', () => {
	it('serialises KernelError instances', () => {
		const error = new KernelError('ValidationError', {
			message: 'Invalid configuration',
			context: { field: 'namespace' },
			data: { expected: 'string' },
		});

		expect(serialiseError(error)).toEqual({
			code: 'ValidationError',
			message: 'Invalid configuration',
			context: { field: 'namespace' },
			data: { expected: 'string' },
		});
	});

	it('serialises native Error objects', () => {
		const error = new Error('boom');
		const result = serialiseError(error);

		expect(result).toMatchObject({
			name: 'Error',
			message: 'boom',
		});
		expect(
			typeof result.stack === 'string' ||
				typeof result.stack === 'undefined'
		).toBe(true);
	});

	it('wraps non-error values', () => {
		expect(serialiseError('oops')).toEqual({ value: 'oops' });
	});
});
