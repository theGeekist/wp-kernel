import type { ErrorContext, ErrorData } from '@wpkernel/core/error';
import { WPKernelError } from '@wpkernel/core/error';

export class BundlerError extends WPKernelError {
	constructor(
		message: string,
		options: {
			data?: ErrorData;
			context?: ErrorContext;
		} = {}
	) {
		super('DeveloperError', {
			message,
			data: options.data,
			context: options.context,
		});

		this.name = 'BundlerError';
		Object.setPrototypeOf(this, BundlerError.prototype);
	}

	static override wrap(
		error: Error,
		_code: Parameters<typeof WPKernelError.wrap>[1] = 'DeveloperError',
		context?: ErrorContext
	): BundlerError {
		if (error instanceof BundlerError) {
			return error;
		}

		if (WPKernelError.isWPKernelError(error)) {
			return new BundlerError(error.message, {
				context: context ?? error.context,
				data: { ...error.data, originalError: error },
			});
		}

		return new BundlerError(error.message, {
			context,
			data: { originalError: error },
		});
	}
}
