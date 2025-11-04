import { __ } from '@wordpress/i18n';

export const listLoadFailedMessage = __(
	'We were unable to load this list. Please try again.',
	'wpkernel'
);

export function formatActionSuccessMessage(
	actionLabel: string,
	itemCount: number
): string {
	if (itemCount <= 1) {
		return `“${actionLabel}” - ${__(
			'completed successfully.',
			'wpkernel'
		)}`;
	}

	return `“${actionLabel}” - ${__(
		'completed for {{count}} items.',
		'wpkernel'
	).replace('{{count}}', String(itemCount))}`;
}
