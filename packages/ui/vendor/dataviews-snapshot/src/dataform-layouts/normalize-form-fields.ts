/**
 * Internal dependencies
 */
import type {
	Form,
	Layout,
	NormalizedLayout,
	NormalizedRegularLayout,
	NormalizedPanelLayout,
	NormalizedCardLayout,
	NormalizedRowLayout,
	NormalizedCardSummaryField,
	CardSummaryField,
} from '../types';

interface NormalizedFormField {
	id: string;
	layout: Layout;
}

export const DEFAULT_LAYOUT: NormalizedLayout = {
	type: 'regular',
	labelPosition: 'top',
};

const normalizeCardSummaryField = (
	sum: CardSummaryField
): NormalizedCardSummaryField => {
	if (typeof sum === 'string') {
		return [{ id: sum, visibility: 'when-collapsed' }];
	}
	return sum.map((item) => {
		if (typeof item === 'string') {
			return { id: item, visibility: 'when-collapsed' };
		}
		return { id: item.id, visibility: item.visibility };
	});
};

/**
 * Normalizes a layout configuration based on its type.
 *
 * @param layout The layout object to normalize.
 * @return The normalized layout object.
 */
export function normalizeLayout(layout?: Layout): NormalizedLayout {
	let normalizedLayout = DEFAULT_LAYOUT;

	if (layout?.type === 'regular') {
		normalizedLayout = {
			type: 'regular',
			labelPosition: layout?.labelPosition ?? 'top',
		} satisfies NormalizedRegularLayout;
	} else if (layout?.type === 'panel') {
		const summary = layout.summary ?? [];
		const normalizedSummary = Array.isArray(summary) ? summary : [summary];

		normalizedLayout = {
			type: 'panel',
			labelPosition: layout?.labelPosition ?? 'side',
			openAs: layout?.openAs ?? 'dropdown',
			summary: normalizedSummary,
		} satisfies NormalizedPanelLayout;
	} else if (layout?.type === 'card') {
		if (layout.withHeader === false) {
			// Don't let isOpened be false if withHeader is false.
			// Otherwise, the card will not be visible.
			normalizedLayout = {
				type: 'card',
				withHeader: false,
				isOpened: true,
				summary: [],
			} satisfies NormalizedCardLayout;
		} else {
			const summary = layout.summary ?? [];

			normalizedLayout = {
				type: 'card',
				withHeader: true,
				isOpened:
					typeof layout.isOpened === 'boolean'
						? layout.isOpened
						: true,
				summary: normalizeCardSummaryField(summary),
			} satisfies NormalizedCardLayout;
		}
	} else if (layout?.type === 'row') {
		normalizedLayout = {
			type: 'row',
			alignment: layout?.alignment ?? 'center',
			styles: layout?.styles ?? {},
		} satisfies NormalizedRowLayout;
	}

	return normalizedLayout;
}

export default function normalizeFormFields(form: Form): NormalizedFormField[] {
	const formLayout = normalizeLayout(form?.layout);

	return (form.fields ?? []).map((field) => {
		if (typeof field === 'string') {
			return {
				id: field,
				layout: formLayout,
			};
		}

		const fieldLayout = field.layout
			? normalizeLayout(field.layout)
			: formLayout;
		return {
			...field,
			layout: fieldLayout,
		};
	});
}
