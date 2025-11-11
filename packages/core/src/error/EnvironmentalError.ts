import type { ErrorContext, ErrorData } from './types';
import { WPKernelError } from './WPKernelError';

export interface EnvironmentalErrorOptions {
	readonly message?: string;
	readonly data?: ErrorData;
	readonly context?: ErrorContext;
}

/**
 * Error thrown when environment or readiness preconditions fail.
 */
export class EnvironmentalError extends WPKernelError {
	public readonly reason: string;

	constructor(reason: string, options: EnvironmentalErrorOptions = {}) {
		const { message, data, context } = options;
		const errorData = data ? { ...data, reason } : { reason };

		super('EnvironmentalError', {
			message:
				message ?? `Environment requirements not satisfied: ${reason}.`,
			data: errorData,
			context,
		});

		this.reason = reason;
		this.name = 'EnvironmentalError';

		Object.setPrototypeOf(this, EnvironmentalError.prototype);
	}
}
