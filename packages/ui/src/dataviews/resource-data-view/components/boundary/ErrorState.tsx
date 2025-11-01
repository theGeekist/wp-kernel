/* @jsxImportSource react */
import { Notice } from '@wordpress/components';
import type { WPKernelError } from '@wpkernel/core/error';
import { listLoadFailedMessage } from '../../i18n';
import { BoundaryFrame } from './BoundaryFrame';

interface ErrorStateProps {
	readonly error?: WPKernelError;
}

function getMessage(error?: WPKernelError): string {
	if (!error) {
		return listLoadFailedMessage;
	}

	return error.message || listLoadFailedMessage;
}

export function ErrorState({ error }: ErrorStateProps) {
	return (
		<BoundaryFrame state="error" role="alert" ariaLive="assertive">
			<Notice status="error" isDismissible={false}>
				<p>{getMessage(error)}</p>
			</Notice>
		</BoundaryFrame>
	);
}
