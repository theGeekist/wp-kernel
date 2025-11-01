/* @jsxImportSource react */
import { Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { WPKernelError } from '@wpkernel/core/error';
import { BoundaryFrame } from './BoundaryFrame';

interface ErrorStateProps {
	readonly error?: WPKernelError;
}

function getMessage(error?: WPKernelError): string {
	if (!error) {
		return __(
			'We were unable to load this list. Please try again.',
			'wpkernel'
		);
	}

	return (
		error.message ||
		__('We were unable to load this list. Please try again.', 'wpkernel')
	);
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
