import { normalizeActionError } from '../../../actions/lifecycle';
import type { ActionPipelineContext } from '../types';
import type { WPKernelError } from '../../../error/WPKernelError';

export type ActionErrorNormaliser = (
	error: unknown,
	context: Pick<ActionPipelineContext, 'actionName' | 'requestId'>
) => WPKernelError;

export function createActionErrorNormaliser(): ActionErrorNormaliser {
	return (error, context) =>
		normalizeActionError(error, context.actionName, context.requestId);
}
