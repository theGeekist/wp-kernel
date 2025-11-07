import { __ } from '@wordpress/i18n';

/**
 * Fallback message for list loading failures surfaced to the UI.
 */
export const listLoadFailedMessage = __(
	'We were unable to load this list. Please try again.',
	'wpkernel'
);

/**
 * Build a localized action success message for notices.
 *
 * @param    actionLabel - Human-readable label for the action.
 * @param    itemCount   - Number of items affected.
 * @returns Localized message suitable for a success notice.
 *
 * @category DataViews Integration
 */
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
