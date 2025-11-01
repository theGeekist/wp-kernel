/* @jsxImportSource react */
import type { ReactNode } from 'react';

interface BoundaryFrameProps {
	readonly state: string;
	readonly role?: 'status' | 'alert';
	readonly ariaLive?: 'polite' | 'assertive';
	readonly children: ReactNode;
}

export function BoundaryFrame({
	state,
	role,
	ariaLive,
	children,
}: BoundaryFrameProps) {
	return (
		<div
			className="wpk-dataview-boundary"
			data-wpk-dataview-boundary={state}
			role={role}
			aria-live={ariaLive}
		>
			{children}
		</div>
	);
}
