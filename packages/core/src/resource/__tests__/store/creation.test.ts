/**
 * Unit tests for createStore factory - Store Creation
 *
 * Tests the @wordpress/data store integration
 */

import { createStore } from '../../store';
import type { ResourceObject } from '../../types';
import type { Reporter } from '../../../reporter';
import {
	createMockResource,
	type MockThing,
	type MockThingQuery,
} from '../../../../tests/resource.test-support';

describe('createStore - Store Creation', () => {
	let mockResource: ResourceObject<MockThing, MockThingQuery>;

	beforeEach(() => {
		({ resource: mockResource } = createMockResource());
	});

	describe('store creation', () => {
		it('should create a store descriptor with correct structure', () => {
			const store = createStore({
				resource: mockResource,
			});

			expect(store).toHaveProperty('storeKey', 'wpk/thing');
			expect(store).toHaveProperty('reducer');
			expect(store).toHaveProperty('actions');
			expect(store).toHaveProperty('selectors');
			expect(store).toHaveProperty('resolvers');
			expect(store).toHaveProperty('initialState');
		});

		it('should use custom getId function when provided', () => {
			const customGetId = (item: MockThing) => `custom-${item.id}`;
			const store = createStore({
				resource: mockResource,
				getId: customGetId,
			});

			expect(store).toBeDefined();
			// getId is used internally in reducer, test via action
		});

		it('should use custom getQueryKey function when provided', () => {
			const customGetQueryKey = (query?: MockThingQuery) =>
				`custom-${JSON.stringify(query)}`;
			const store = createStore({
				resource: mockResource,
				getQueryKey: customGetQueryKey,
			});

			expect(store).toBeDefined();
		});

		it('should merge custom initial state', () => {
			const customInitialState = {
				items: { 99: { id: 99, title: 'Preset', status: 'active' } },
			};
			const store = createStore({
				resource: mockResource,
				initialState: customInitialState,
			});

			// Create initial state and check
			const state = store.reducer(undefined, { type: '@@INIT' });
			expect(state.items).toHaveProperty('99');
			expect(state.items[99]).toEqual({
				id: 99,
				title: 'Preset',
				status: 'active',
			});
		});

		it('should warn when custom getId returns undefined', () => {
			const warn = jest.fn();
			const reporter: Reporter = {
				info: jest.fn(),
				warn,
				error: jest.fn(),
				debug: jest.fn(),
				child: () => reporter,
			};

			const store = createStore({
				resource: mockResource,
				reporter,
				getId: (() => undefined) as unknown as (
					item: MockThing
				) => string | number,
			});

			store.reducer(
				undefined,
				store.actions.receiveItem({
					id: 101,
					title: 'Missing identifier',
					status: 'active',
				})
			);

			expect(warn).toHaveBeenCalledWith(
				'resource.store.identifier.invalid',
				expect.objectContaining({
					resource: mockResource.name,
					operation: 'receiveItem',
				})
			);
		});

		it('should warn when duplicate identifiers are produced', () => {
			const warn = jest.fn();
			const reporter: Reporter = {
				info: jest.fn(),
				warn,
				error: jest.fn(),
				debug: jest.fn(),
				child: () => reporter,
			};

			const store = createStore({
				resource: mockResource,
				reporter,
				getId: (() => 'duplicate-id') as unknown as (
					item: MockThing
				) => string | number,
			});

			store.reducer(
				undefined,
				store.actions.receiveItems(
					'custom-query',
					[
						{
							id: 1,
							title: 'First',
							status: 'active',
						},
						{
							id: 2,
							title: 'Second',
							status: 'inactive',
						},
					],
					undefined
				)
			);

			expect(warn).toHaveBeenCalledWith(
				'resource.store.identifier.duplicate',
				expect.objectContaining({
					resource: mockResource.name,
					id: 'duplicate-id',
					queryKey: 'custom-query',
				})
			);
		});
	});
});
