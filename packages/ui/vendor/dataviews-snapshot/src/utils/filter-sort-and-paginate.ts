/**
 * External dependencies
 */
import removeAccents from 'remove-accents';
import { subDays, subWeeks, subMonths, subYears } from 'date-fns';

/**
 * WordPress dependencies
 */
import { getDate } from '@wordpress/date';

/**
 * Internal dependencies
 */
import {
	OPERATOR_IS,
	OPERATOR_IS_NOT,
	OPERATOR_IS_NONE,
	OPERATOR_IS_ANY,
	OPERATOR_IS_ALL,
	OPERATOR_IS_NOT_ALL,
	OPERATOR_LESS_THAN,
	OPERATOR_GREATER_THAN,
	OPERATOR_LESS_THAN_OR_EQUAL,
	OPERATOR_GREATER_THAN_OR_EQUAL,
	OPERATOR_BEFORE,
	OPERATOR_AFTER,
	OPERATOR_BEFORE_INC,
	OPERATOR_AFTER_INC,
	OPERATOR_CONTAINS,
	OPERATOR_NOT_CONTAINS,
	OPERATOR_STARTS_WITH,
	OPERATOR_BETWEEN,
	OPERATOR_ON,
	OPERATOR_NOT_ON,
	OPERATOR_IN_THE_PAST,
	OPERATOR_OVER,
} from '../constants';
import normalizeFields from './normalize-fields';
import type { Field, View } from '../types';

function normalizeSearchInput(input = '') {
	return removeAccents(input.trim().toLowerCase());
}

const EMPTY_ARRAY: [] = [];

/**
 * Calculates a date offset from now.
 *
 * @param value Number of units to offset.
 * @param unit  Unit of time to offset.
 * @return      Date offset from now.
 */
function getRelativeDate(value: number, unit: string): Date {
	switch (unit) {
		case 'days':
			return subDays(new Date(), value);
		case 'weeks':
			return subWeeks(new Date(), value);
		case 'months':
			return subMonths(new Date(), value);
		case 'years':
			return subYears(new Date(), value);
		default:
			return new Date();
	}
}

/**
 * Applies the filtering, sorting and pagination to the raw data based on the view configuration.
 *
 * @param data   Raw data.
 * @param view   View config.
 * @param fields Fields config.
 *
 * @return Filtered, sorted and paginated data.
 */
export default function filterSortAndPaginate<Item>(
	data: Item[],
	view: View,
	fields: Field<Item>[]
): {
	data: Item[];
	paginationInfo: { totalItems: number; totalPages: number };
} {
	if (!data) {
		return {
			data: EMPTY_ARRAY,
			paginationInfo: { totalItems: 0, totalPages: 0 },
		};
	}
	const _fields = normalizeFields(fields);
	let filteredData = [...data];
	// Handle global search.
	if (view.search) {
		const normalizedSearch = normalizeSearchInput(view.search);
		filteredData = filteredData.filter((item) => {
			return _fields
				.filter((field) => field.enableGlobalSearch)
				.some((field) => {
					const fieldValue = field.getValue({ item });
					const values = Array.isArray(fieldValue)
						? fieldValue
						: [fieldValue];
					return values.some((value) =>
						normalizeSearchInput(String(value)).includes(
							normalizedSearch
						)
					);
				});
		});
	}

	if (view.filters && view.filters?.length > 0) {
		view.filters.forEach((filter) => {
			const field = _fields.find((_field) => _field.id === filter.field);
			if (field) {
				if (
					filter.operator === OPERATOR_IS_ANY &&
					filter?.value?.length > 0
				) {
					filteredData = filteredData.filter((item) => {
						const fieldValue = field.getValue({ item });
						if (Array.isArray(fieldValue)) {
							return filter.value.some((filterValue: any) =>
								fieldValue.includes(filterValue)
							);
						} else if (typeof fieldValue === 'string') {
							return filter.value.includes(fieldValue);
						}
						return false;
					});
				} else if (
					filter.operator === OPERATOR_IS_NONE &&
					filter?.value?.length > 0
				) {
					filteredData = filteredData.filter((item) => {
						const fieldValue = field.getValue({ item });
						if (Array.isArray(fieldValue)) {
							return !filter.value.some((filterValue: any) =>
								fieldValue.includes(filterValue)
							);
						} else if (typeof fieldValue === 'string') {
							return !filter.value.includes(fieldValue);
						}
						return false;
					});
				} else if (
					filter.operator === OPERATOR_IS_ALL &&
					filter?.value?.length > 0
				) {
					filteredData = filteredData.filter((item) => {
						return filter.value.every((value: any) => {
							return field.getValue({ item })?.includes(value);
						});
					});
				} else if (
					filter.operator === OPERATOR_IS_NOT_ALL &&
					filter?.value?.length > 0
				) {
					filteredData = filteredData.filter((item) => {
						return filter.value.every((value: any) => {
							return !field.getValue({ item })?.includes(value);
						});
					});
				} else if (filter.operator === OPERATOR_IS) {
					filteredData = filteredData.filter((item) => {
						return (
							filter.value === field.getValue({ item }) ||
							filter.value === undefined
						);
					});
				} else if (filter.operator === OPERATOR_IS_NOT) {
					filteredData = filteredData.filter((item) => {
						return filter.value !== field.getValue({ item });
					});
				} else if (
					filter.operator === OPERATOR_ON &&
					filter.value !== undefined
				) {
					const filterDate = getDate(filter.value);
					filteredData = filteredData.filter((item) => {
						const fieldDate = getDate(field.getValue({ item }));
						return filterDate.getTime() === fieldDate.getTime();
					});
				} else if (
					filter.operator === OPERATOR_NOT_ON &&
					filter.value !== undefined
				) {
					const filterDate = getDate(filter.value);
					filteredData = filteredData.filter((item) => {
						const fieldDate = getDate(field.getValue({ item }));
						return filterDate.getTime() !== fieldDate.getTime();
					});
				} else if (
					filter.operator === OPERATOR_LESS_THAN &&
					filter.value !== undefined
				) {
					filteredData = filteredData.filter((item) => {
						const fieldValue = field.getValue({ item });
						return fieldValue < filter.value;
					});
				} else if (
					filter.operator === OPERATOR_GREATER_THAN &&
					filter.value !== undefined
				) {
					filteredData = filteredData.filter((item) => {
						const fieldValue = field.getValue({ item });
						return fieldValue > filter.value;
					});
				} else if (
					filter.operator === OPERATOR_LESS_THAN_OR_EQUAL &&
					filter.value !== undefined
				) {
					filteredData = filteredData.filter((item) => {
						const fieldValue = field.getValue({ item });
						return fieldValue <= filter.value;
					});
				} else if (
					filter.operator === OPERATOR_GREATER_THAN_OR_EQUAL &&
					filter.value !== undefined
				) {
					filteredData = filteredData.filter((item) => {
						const fieldValue = field.getValue({ item });
						return fieldValue >= filter.value;
					});
				} else if (
					filter.operator === OPERATOR_CONTAINS &&
					filter?.value !== undefined
				) {
					filteredData = filteredData.filter((item) => {
						const fieldValue = field.getValue({ item });
						return (
							typeof fieldValue === 'string' &&
							filter.value &&
							fieldValue
								.toLowerCase()
								.includes(String(filter.value).toLowerCase())
						);
					});
				} else if (
					filter.operator === OPERATOR_NOT_CONTAINS &&
					filter?.value !== undefined
				) {
					filteredData = filteredData.filter((item) => {
						const fieldValue = field.getValue({ item });
						return (
							typeof fieldValue === 'string' &&
							filter.value &&
							!fieldValue
								.toLowerCase()
								.includes(String(filter.value).toLowerCase())
						);
					});
				} else if (
					filter.operator === OPERATOR_STARTS_WITH &&
					filter?.value !== undefined
				) {
					filteredData = filteredData.filter((item) => {
						const fieldValue = field.getValue({ item });
						return (
							typeof fieldValue === 'string' &&
							filter.value &&
							fieldValue
								.toLowerCase()
								.startsWith(String(filter.value).toLowerCase())
						);
					});
				} else if (
					filter.operator === OPERATOR_BEFORE &&
					filter.value !== undefined
				) {
					const filterValue = getDate(filter.value);
					filteredData = filteredData.filter((item) => {
						const fieldValue = getDate(field.getValue({ item }));
						return fieldValue < filterValue;
					});
				} else if (
					filter.operator === OPERATOR_AFTER &&
					filter.value !== undefined
				) {
					const filterValue = getDate(filter.value);
					filteredData = filteredData.filter((item) => {
						const fieldValue = getDate(field.getValue({ item }));
						return fieldValue > filterValue;
					});
				} else if (
					filter.operator === OPERATOR_BEFORE_INC &&
					filter.value !== undefined
				) {
					const filterValue = getDate(filter.value);
					filteredData = filteredData.filter((item) => {
						const fieldValue = getDate(field.getValue({ item }));
						return fieldValue <= filterValue;
					});
				} else if (
					filter.operator === OPERATOR_AFTER_INC &&
					filter.value !== undefined
				) {
					const filterValue = getDate(filter.value);
					filteredData = filteredData.filter((item) => {
						const fieldValue = getDate(field.getValue({ item }));
						return fieldValue >= filterValue;
					});
				} else if (
					filter.operator === OPERATOR_BETWEEN &&
					Array.isArray(filter.value) &&
					filter.value.length === 2 &&
					filter.value[0] !== undefined &&
					filter.value[1] !== undefined
				) {
					filteredData = filteredData.filter((item) => {
						const fieldValue = field.getValue({ item });
						if (
							typeof fieldValue === 'number' ||
							fieldValue instanceof Date ||
							typeof fieldValue === 'string'
						) {
							return (
								fieldValue >= filter.value[0] &&
								fieldValue <= filter.value[1]
							);
						}
						return false;
					});
				} else if (
					filter.operator === OPERATOR_IN_THE_PAST &&
					filter.value?.value !== undefined &&
					filter.value?.unit !== undefined
				) {
					const targetDate = getRelativeDate(
						filter.value.value,
						filter.value.unit
					);
					filteredData = filteredData.filter((item) => {
						const fieldValue = getDate(field.getValue({ item }));
						return (
							fieldValue >= targetDate && fieldValue <= new Date()
						);
					});
				} else if (
					filter.operator === OPERATOR_OVER &&
					filter.value?.value !== undefined &&
					filter.value?.unit !== undefined
				) {
					const targetDate = getRelativeDate(
						filter.value.value,
						filter.value.unit
					);
					filteredData = filteredData.filter((item) => {
						const fieldValue = getDate(field.getValue({ item }));
						return fieldValue < targetDate;
					});
				}
			}
		});
	}

	// Handle sorting.
	const sortByField = view.sort?.field
		? _fields.find((field) => {
				return field.id === view.sort?.field;
			})
		: null;
	const groupByField = view.groupByField
		? _fields.find((field) => {
				return field.id === view.groupByField;
			})
		: null;
	if (sortByField || groupByField) {
		filteredData.sort((a, b) => {
			if (groupByField) {
				const groupCompare = groupByField.sort(a, b, 'asc');

				// If items are in different groups, return the group comparison result.
				// Otherwise, fall back to sorting by the sort field.
				if (groupCompare !== 0) {
					return groupCompare;
				}
			}

			if (sortByField) {
				return sortByField.sort(a, b, view.sort?.direction ?? 'desc');
			}

			return 0;
		});
	}

	// Handle pagination.
	let totalItems = filteredData.length;
	let totalPages = 1;
	if (view.page !== undefined && view.perPage !== undefined) {
		const start = (view.page - 1) * view.perPage;
		totalItems = filteredData?.length || 0;
		totalPages = Math.ceil(totalItems / view.perPage);
		filteredData = filteredData?.slice(start, start + view.perPage);
	}

	return {
		data: filteredData,
		paginationInfo: {
			totalItems,
			totalPages,
		},
	};
}
