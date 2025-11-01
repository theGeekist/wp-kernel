/* @jsxImportSource react */
import { Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { PermissionState } from '../../types/state';
import { BoundaryFrame } from './BoundaryFrame';

interface PermissionDeniedStateProps {
	readonly permission: PermissionState;
}

export function PermissionDeniedState({
	permission,
}: PermissionDeniedStateProps) {
	return (
		<BoundaryFrame state="denied" role="alert" ariaLive="assertive">
			<Notice status="warning" isDismissible={false}>
				<p>
					{__(
						'You do not have permission to view this screen.',
						'wpkernel'
					)}
				</p>
				{permission.capability ? (
					<p>
						{__('Required capability:', 'wpkernel')}{' '}
						<code>{permission.capability}</code>
					</p>
				) : null}
				{permission.error?.message ? (
					<p>{permission.error.message}</p>
				) : null}
			</Notice>
		</BoundaryFrame>
	);
}
