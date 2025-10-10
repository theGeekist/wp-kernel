/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type {
	DataViewRenderFieldProps,
	SortDirection,
	NormalizedField,
	FieldTypeDefinition,
} from '../types';
import renderFromElements from './utils/render-from-elements';
import {
	OPERATOR_IS,
	OPERATOR_IS_ALL,
	OPERATOR_IS_NOT_ALL,
	OPERATOR_IS_ANY,
	OPERATOR_IS_NONE,
	OPERATOR_IS_NOT,
	OPERATOR_CONTAINS,
	OPERATOR_NOT_CONTAINS,
	OPERATOR_STARTS_WITH,
} from '../constants';

function sort(valueA: any, valueB: any, direction: SortDirection) {
	return direction === 'asc'
		? valueA.localeCompare(valueB)
		: valueB.localeCompare(valueA);
}

// Email validation regex based on HTML5 spec
// https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
const emailRegex =
	/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export default {
	sort,
	isValid: {
		custom: (item: any, field: NormalizedField<any>) => {
			const value = field.getValue({ item });

			if (
				![undefined, '', null].includes(value) &&
				!emailRegex.test(value)
			) {
				return __('Value must be a valid email address.');
			}

			if (field.elements) {
				const validValues = field.elements.map((f) => f.value);
				if (!validValues.includes(value)) {
					return __('Value must be one of the elements.');
				}
			}

			return null;
		},
	},
	Edit: 'email',
	render: ({ item, field }: DataViewRenderFieldProps<any>) => {
		return field.elements
			? renderFromElements({ item, field })
			: field.getValue({ item });
	},
	enableSorting: true,
	filterBy: {
		defaultOperators: [OPERATOR_IS_ANY, OPERATOR_IS_NONE],
		validOperators: [
			OPERATOR_IS,
			OPERATOR_IS_NOT,
			OPERATOR_CONTAINS,
			OPERATOR_NOT_CONTAINS,
			OPERATOR_STARTS_WITH,
			// Multiple selection
			OPERATOR_IS_ANY,
			OPERATOR_IS_NONE,
			OPERATOR_IS_ALL,
			OPERATOR_IS_NOT_ALL,
		],
	},
} satisfies FieldTypeDefinition<any>;
