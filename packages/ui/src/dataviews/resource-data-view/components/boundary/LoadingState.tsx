/* @jsxImportSource react */
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { BoundaryFrame } from './BoundaryFrame';

export function LoadingState() {
	return (
		<BoundaryFrame state="loading" role="status" ariaLive="polite">
			<div className="wpk-dataview-boundary__content">
				<Spinner />
				<p>{__('Loading…', 'wpkernel')}</p>
			</div>
		</BoundaryFrame>
	);
}
