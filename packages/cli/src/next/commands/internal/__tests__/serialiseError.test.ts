import {
	KernelError,
	serializeKernelError,
	type SerializedError,
} from '@wpkernel/core/contracts';
import { serialiseError } from '../serialiseError';

describe('serialiseError', () => {
	it('returns serialized kernel errors unchanged', () => {
		const kernelError = new KernelError('DeveloperError', {
			message: 'Already typed error',
			data: { value: 123 },
		});

		const result = serialiseError(kernelError);

		expect(result).toEqual(serializeKernelError(kernelError));
	});

	it('wraps native errors with KernelError metadata', () => {
		const nativeError = new Error('native failure');

		const result = serialiseError(nativeError);

		expect(result).toMatchObject<SerializedError>({
			code: 'UnknownError',
			message: nativeError.message,
		});
		expect(result.data?.originalError).toBe(nativeError);
	});

	it('creates an unknown error payload for arbitrary inputs', () => {
		const result = serialiseError({ some: 'value' });

		expect(result).toMatchObject<SerializedError>({
			code: 'UnknownError',
			message: 'Unexpected error occurred.',
		});
		expect(result.data?.value).toEqual({ some: 'value' });
	});
});
