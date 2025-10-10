/**
 * External dependencies
 */
import type { FunctionComponent } from 'react';

/**
 * Internal dependencies
 */
import getFieldTypeDefinition from '../field-types';
import type {
	DataViewRenderFieldProps,
	Field,
	FieldTypeDefinition,
	NormalizedFilterByConfig,
	NormalizedField,
} from '../types';
import { getControl } from '../dataform-controls';
import {
	ALL_OPERATORS,
	OPERATOR_BETWEEN,
	SINGLE_SELECTION_OPERATORS,
} from '../constants';

const getValueFromId =
	(id: string) =>
	({ item }: { item: any }) => {
		const path = id.split('.');
		let value = item;
		for (const segment of path) {
			if (value.hasOwnProperty(segment)) {
				value = value[segment];
			} else {
				value = undefined;
			}
		}

		return value;
	};

const setValueFromId =
	(id: string) =>
	({ value }: { value: any }) => {
		const path = id.split('.');
		const result: any = {};
		let current = result;

		for (const segment of path.slice(0, -1)) {
			current[segment] = {};
			current = current[segment];
		}

		current[path.at(-1)!] = value;
		return result;
	};

function getFilterBy<Item>(
	field: Field<Item>,
	fieldTypeDefinition: FieldTypeDefinition<Item>
): NormalizedFilterByConfig | false {
	if (field.filterBy === false) {
		return false;
	}

	if (typeof field.filterBy === 'object') {
		let operators = field.filterBy.operators;

		// Assign default values if no operator was provided.
		if (!operators || !Array.isArray(operators)) {
			operators = !!fieldTypeDefinition.filterBy
				? fieldTypeDefinition.filterBy.defaultOperators
				: [];
		}

		// Make sure only valid operators are included.
		let validOperators = ALL_OPERATORS;
		if (typeof fieldTypeDefinition.filterBy === 'object') {
			validOperators = fieldTypeDefinition.filterBy.validOperators;
		}
		operators = operators.filter((operator) =>
			validOperators.includes(operator)
		);

		// The `between` operator is not supported when elements are provided.
		if (field.elements && operators.includes(OPERATOR_BETWEEN)) {
			operators = operators.filter(
				(operator) => operator !== OPERATOR_BETWEEN
			);
		}

		// Do not allow mixing single & multiselection operators.
		// Remove multiselection operators if any of the single selection ones is present.
		const hasSingleSelectionOperator = operators.some((operator) =>
			SINGLE_SELECTION_OPERATORS.includes(operator)
		);
		if (hasSingleSelectionOperator) {
			operators = operators.filter((operator) =>
				// The 'Between' operator is unique as it can be combined with single selection operators.
				[...SINGLE_SELECTION_OPERATORS, OPERATOR_BETWEEN].includes(
					operator
				)
			);
		}

		// If no operators are left at this point,
		// the filters should be disabled.
		if (operators.length === 0) {
			return false;
		}

		return {
			isPrimary: !!field.filterBy.isPrimary,
			operators,
		};
	}

	if (fieldTypeDefinition.filterBy === false) {
		return false;
	}

	let defaultOperators = fieldTypeDefinition.filterBy.defaultOperators;
	// The `between` operator is not supported when elements are provided.
	if (field.elements && defaultOperators.includes(OPERATOR_BETWEEN)) {
		defaultOperators = defaultOperators.filter(
			(operator) => operator !== OPERATOR_BETWEEN
		);
	}

	return {
		operators: defaultOperators,
	};
}

/**
 * Apply default values and normalize the fields config.
 *
 * @param fields Fields config.
 * @return Normalized fields config.
 */
export default function normalizeFields<Item>(
	fields: Field<Item>[]
): NormalizedField<Item>[] {
	return fields.map((field) => {
		const fieldTypeDefinition = getFieldTypeDefinition<Item>(field.type);
		const getValue = field.getValue || getValueFromId(field.id);
		const setValue = field.setValue || setValueFromId(field.id);

		const sort =
			field.sort ??
			function sort(a, b, direction) {
				return fieldTypeDefinition.sort(
					getValue({ item: a }),
					getValue({ item: b }),
					direction
				);
			};

		const isValid = {
			...fieldTypeDefinition.isValid,
			...field.isValid,
		};

		const Edit = getControl(field, fieldTypeDefinition);

		const render =
			field.render ??
			function render({
				item,
				field: renderedField,
			}: DataViewRenderFieldProps<Item>) {
				return (
					fieldTypeDefinition.render as FunctionComponent<
						DataViewRenderFieldProps<Item>
					>
				)({ item, field: renderedField });
			};

		const filterBy = getFilterBy(field, fieldTypeDefinition);

		return {
			...field,
			label: field.label || field.id,
			header: field.header || field.label || field.id,
			getValue,
			setValue,
			render,
			sort,
			isValid,
			Edit,
			enableHiding: field.enableHiding ?? true,
			enableSorting:
				field.enableSorting ??
				fieldTypeDefinition.enableSorting ??
				true,
			filterBy,
			readOnly: field.readOnly ?? fieldTypeDefinition.readOnly ?? false,
		};
	});
}
