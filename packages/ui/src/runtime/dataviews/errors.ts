import { WPKernelError } from '@wpkernel/core/error';
import type { ErrorCode, ErrorContext } from '@wpkernel/core/error';

abstract class BaseDataViewsError extends WPKernelError {
	protected constructor(
		name: string,
		code: ErrorCode,
		options: {
			message: string;
			context?: ErrorContext;
			data?: Record<string, unknown>;
		}
	) {
		super(code, {
			message: options.message,
			context: options.context,
			data: options.data,
		});
		this.name = name;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class DataViewsConfigurationError extends BaseDataViewsError {
	constructor(message: string, context?: ErrorContext) {
		super('DataViewsConfigurationError', 'DeveloperError', {
			message,
			context,
		});
	}
}

export class DataViewsControllerError extends BaseDataViewsError {
	constructor(message: string, context?: ErrorContext) {
		super('DataViewsControllerError', 'UnknownError', {
			message,
			context,
		});
	}
}

export class DataViewsActionError extends BaseDataViewsError {
	constructor(message: string, context?: ErrorContext) {
		super('DataViewsActionError', 'ValidationError', {
			message,
			context,
		});
	}
}
