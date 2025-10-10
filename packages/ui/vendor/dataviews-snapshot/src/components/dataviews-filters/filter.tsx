/**
 * External dependencies
 */
import clsx from 'clsx';
import type { RefObject } from 'react';

/**
 * WordPress dependencies
 */
import {
	Dropdown,
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
	FlexItem,
	SelectControl,
	Tooltip,
	Icon,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { useRef, createInterpolateElement } from '@wordpress/element';
import { closeSmall } from '@wordpress/icons';

const ENTER = 'Enter';
const SPACE = ' ';

/**
 * Internal dependencies
 */
import SearchWidget from './search-widget';
import InputWidget from './input-widget';
import {
	OPERATORS,
	OPERATOR_IS,
	OPERATOR_IS_NOT,
	OPERATOR_IS_ANY,
	OPERATOR_IS_NONE,
	OPERATOR_IS_ALL,
	OPERATOR_IS_NOT_ALL,
	OPERATOR_LESS_THAN,
	OPERATOR_GREATER_THAN,
	OPERATOR_LESS_THAN_OR_EQUAL,
	OPERATOR_GREATER_THAN_OR_EQUAL,
	OPERATOR_CONTAINS,
	OPERATOR_NOT_CONTAINS,
	OPERATOR_STARTS_WITH,
	OPERATOR_BEFORE,
	OPERATOR_AFTER,
	OPERATOR_BEFORE_INC,
	OPERATOR_AFTER_INC,
	OPERATOR_BETWEEN,
	OPERATOR_ON,
	OPERATOR_NOT_ON,
	OPERATOR_IN_THE_PAST,
	OPERATOR_OVER,
} from '../../constants';
import type {
	Filter,
	NormalizedFilter,
	Operator,
	Option,
	View,
	NormalizedField,
} from '../../types';

interface FilterTextProps {
	activeElements: Option[];
	filterInView?: Filter;
	filter: NormalizedFilter;
}

interface OperatorSelectorProps {
	filter: NormalizedFilter;
	view: View;
	onChangeView: (view: View) => void;
}

interface FilterProps extends OperatorSelectorProps {
	addFilterRef: RefObject<HTMLButtonElement>;
	openedFilter: string | null;
	fields: NormalizedField<any>[];
}

const FilterText = ({
	activeElements,
	filterInView,
	filter,
}: FilterTextProps) => {
	if (activeElements === undefined || activeElements.length === 0) {
		return filter.name;
	}

	const filterTextWrappers = {
		Name: <span className="dataviews-filters__summary-filter-text-name" />,
		Value: (
			<span className="dataviews-filters__summary-filter-text-value" />
		),
	};

	if (filterInView?.operator === OPERATOR_IS_ANY) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Author is any: Admin, Editor". */
				__('<Name>%1$s is any: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements.map((element) => element.label).join(', ')
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_IS_NONE) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Author is none: Admin, Editor". */
				__('<Name>%1$s is none: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements.map((element) => element.label).join(', ')
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_IS_ALL) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Author is all: Admin, Editor". */
				__('<Name>%1$s is all: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements.map((element) => element.label).join(', ')
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_IS_NOT_ALL) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Author is not all: Admin, Editor". */
				__('<Name>%1$s is not all: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements.map((element) => element.label).join(', ')
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_IS) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Author is: Admin". */
				__('<Name>%1$s is: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_IS_NOT) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Author is not: Admin". */
				__('<Name>%1$s is not: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_LESS_THAN) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Price is less than: 10". */
				__('<Name>%1$s is less than: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_GREATER_THAN) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Price is greater than: 10". */
				__('<Name>%1$s is greater than: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_LESS_THAN_OR_EQUAL) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Price is less than or equal to: 10". */
				__(
					'<Name>%1$s is less than or equal to: </Name><Value>%2$s</Value>'
				),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_GREATER_THAN_OR_EQUAL) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Price is greater than or equal to: 10". */
				__(
					'<Name>%1$s is greater than or equal to: </Name><Value>%2$s</Value>'
				),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_CONTAINS) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Title contains: Mars". */
				__('<Name>%1$s contains: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_NOT_CONTAINS) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Description doesn't contain: photo". */
				__("<Name>%1$s doesn't contain: </Name><Value>%2$s</Value>"),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_STARTS_WITH) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Title starts with: Mar". */
				__('<Name>%1$s starts with: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_BEFORE) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Date is before: 2024-01-01". */
				__('<Name>%1$s is before: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_AFTER) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Date is after: 2024-01-01". */
				__('<Name>%1$s is after: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_BEFORE_INC) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Date is on or before: 2024-01-01". */
				__('<Name>%1$s is on or before: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_AFTER_INC) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Date is on or after: 2024-01-01". */
				__('<Name>%1$s is on or after: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_BETWEEN) {
		const { label } = activeElements[0];

		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Min value. 3: Max value. e.g.: "Item count between (inc): 10 and 180". */
				__(
					'<Name>%1$s between (inc): </Name><Value>%2$s and %3$s</Value>'
				),
				filter.name,
				label[0],
				label[1]
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_ON) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Date is: 2024-01-01". */
				__('<Name>%1$s is: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_NOT_ON) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Date is not: 2024-01-01". */
				__('<Name>%1$s is not: </Name><Value>%2$s</Value>'),
				filter.name,
				activeElements[0].label
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_IN_THE_PAST) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Date is in the past: 1 days". */
				__('<Name>%1$s is in the past: </Name><Value>%2$s</Value>'),
				filter.name,
				`${activeElements[0].value.value} ${activeElements[0].value.unit}`
			),
			filterTextWrappers
		);
	}

	if (filterInView?.operator === OPERATOR_OVER) {
		return createInterpolateElement(
			sprintf(
				/* translators: 1: Filter name. 2: Filter value. e.g.: "Date is over: 1 days ago". */
				__('<Name>%1$s is over: </Name><Value>%2$s</Value> ago'),
				filter.name,
				`${activeElements[0].value.value} ${activeElements[0].value.unit}`
			),
			filterTextWrappers
		);
	}
	return sprintf(
		/* translators: 1: Filter name e.g.: "Unknown status for Author". */
		__('Unknown status for %1$s'),
		filter.name
	);
};

function OperatorSelector({
	filter,
	view,
	onChangeView,
}: OperatorSelectorProps) {
	const operatorOptions = filter.operators?.map((operator) => ({
		value: operator,
		label: OPERATORS[operator]?.label,
	}));
	const currentFilter = view.filters?.find(
		(_filter) => _filter.field === filter.field
	);
	const value = currentFilter?.operator || filter.operators[0];
	return (
		operatorOptions.length > 1 && (
			<HStack
				spacing={2}
				justify="flex-start"
				className="dataviews-filters__summary-operators-container"
			>
				<FlexItem className="dataviews-filters__summary-operators-filter-name">
					{filter.name}
				</FlexItem>

				<SelectControl
					className="dataviews-filters__summary-operators-filter-select"
					label={__('Conditions')}
					value={value}
					options={operatorOptions}
					onChange={(newValue) => {
						const operator = newValue as Operator;
						const currentOperator = currentFilter?.operator;
						const newFilters = currentFilter
							? [
									...(view.filters ?? []).map((_filter) => {
										if (_filter.field === filter.field) {
											// Reset the value only when switching between operators that have different value types.
											const OPERATORS_SHOULD_RESET_VALUE =
												[
													OPERATOR_BETWEEN,
													OPERATOR_IN_THE_PAST,
													OPERATOR_OVER,
												];
											const shouldResetValue =
												currentOperator &&
												(OPERATORS_SHOULD_RESET_VALUE.includes(
													currentOperator
												) ||
													OPERATORS_SHOULD_RESET_VALUE.includes(
														operator
													));

											return {
												..._filter,
												value: shouldResetValue
													? undefined
													: _filter.value,
												operator,
											};
										}
										return _filter;
									}),
								]
							: [
									...(view.filters ?? []),
									{
										field: filter.field,
										operator,
										value: undefined,
									},
								];
						onChangeView({
							...view,
							page: 1,
							filters: newFilters,
						});
					}}
					size="small"
					variant="minimal"
					__nextHasNoMarginBottom
					hideLabelFromVision
				/>
			</HStack>
		)
	);
}

export default function Filter({
	addFilterRef,
	openedFilter,
	fields,
	...commonProps
}: FilterProps) {
	const toggleRef = useRef<HTMLDivElement>(null);
	const { filter, view, onChangeView } = commonProps;
	const filterInView = view.filters?.find((f) => f.field === filter.field);

	let activeElements: Option[] = [];

	if (filter.elements.length > 0) {
		activeElements = filter.elements.filter((element) => {
			if (filter.singleSelection) {
				return element.value === filterInView?.value;
			}
			return filterInView?.value?.includes(element.value);
		});
	} else if (filterInView?.value !== undefined) {
		activeElements = [
			{
				value: filterInView.value,
				label: filterInView.value,
			},
		];
	}

	const isPrimary = filter.isPrimary;
	const isLocked = filterInView?.isLocked;
	const hasValues = !isLocked && filterInView?.value !== undefined;
	const canResetOrRemove = !isLocked && (!isPrimary || hasValues);
	return (
		<Dropdown
			defaultOpen={openedFilter === filter.field}
			contentClassName="dataviews-filters__summary-popover"
			popoverProps={{ placement: 'bottom-start', role: 'dialog' }}
			onClose={() => {
				toggleRef.current?.focus();
			}}
			renderToggle={({ isOpen, onToggle }) => (
				<div className="dataviews-filters__summary-chip-container">
					<Tooltip
						text={sprintf(
							/* translators: 1: Filter name. */
							__('Filter by: %1$s'),
							filter.name.toLowerCase()
						)}
						placement="top"
					>
						<div
							className={clsx('dataviews-filters__summary-chip', {
								'has-reset': canResetOrRemove,
								'has-values': hasValues,
								'is-not-clickable': isLocked,
							})}
							role="button"
							tabIndex={isLocked ? -1 : 0}
							onClick={() => {
								if (!isLocked) {
									onToggle();
								}
							}}
							onKeyDown={(event) => {
								if (
									!isLocked &&
									[ENTER, SPACE].includes(event.key)
								) {
									onToggle();
									event.preventDefault();
								}
							}}
							aria-disabled={isLocked}
							aria-pressed={isOpen}
							aria-expanded={isOpen}
							ref={toggleRef}
						>
							<FilterText
								activeElements={activeElements}
								filterInView={filterInView}
								filter={filter}
							/>
						</div>
					</Tooltip>
					{canResetOrRemove && (
						<Tooltip
							text={isPrimary ? __('Reset') : __('Remove')}
							placement="top"
						>
							<button
								className={clsx(
									'dataviews-filters__summary-chip-remove',
									{ 'has-values': hasValues }
								)}
								onClick={() => {
									onChangeView({
										...view,
										page: 1,
										filters: view.filters?.filter(
											(_filter) =>
												_filter.field !== filter.field
										),
									});
									// If the filter is not primary and can be removed, it will be added
									// back to the available filters from `Add filter` component.
									if (!isPrimary) {
										addFilterRef.current?.focus();
									} else {
										// If is primary, focus the toggle button.
										toggleRef.current?.focus();
									}
								}}
							>
								<Icon icon={closeSmall} />
							</button>
						</Tooltip>
					)}
				</div>
			)}
			renderContent={() => {
				return (
					<VStack spacing={0} justify="flex-start">
						<OperatorSelector {...commonProps} />
						{commonProps.filter.elements.length > 0 ? (
							<SearchWidget
								{...commonProps}
								filter={{
									...commonProps.filter,
									elements: commonProps.filter.elements,
								}}
							/>
						) : (
							<InputWidget {...commonProps} fields={fields} />
						)}
					</VStack>
				);
			}}
		/>
	);
}
