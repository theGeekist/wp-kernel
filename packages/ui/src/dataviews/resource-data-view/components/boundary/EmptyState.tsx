/* @jsxImportSource react */
import type { ReactNode } from 'react';
import { __ } from '@wordpress/i18n';
import { BoundaryFrame } from './BoundaryFrame';

interface EmptyStateProps {
	readonly empty?: ReactNode;
}

export function EmptyState({ empty }: EmptyStateProps) {
	return (
		<BoundaryFrame state="empty" role="status" ariaLive="polite">
			<div className="wpk-dataview-boundary__content">
				{empty ?? <p>{__('No items found.', 'wpkernel')}</p>}
			</div>
		</BoundaryFrame>
	);
}
