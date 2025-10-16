/**
 * Unit tests for createStore factory - Cache Keys
 *
 * Tests the @wordpress/data store integration
 */

import { createStore } from '../../store';
import type { ResourceObject } from '../../types';
import {
	createMockResource,
	type MockThing,
	type MockThingQuery,
} from '../../../../tests/resource.test-support';

describe('createStore - Cache Keys', () => {
	let mockResource: ResourceObject<MockThing, MockThingQuery>;

	beforeEach(() => {
		({ resource: mockResource } = createMockResource());
	});

	describe('cache key generation', () => {
		it('should use default getId with id property', () => {
			const store = createStore({
				resource: mockResource,
			});

			const item = { id: 123, title: 'Test', status: 'active' };
			const state = store.reducer(
				undefined,
				store.actions.receiveItem(item)
			);

			expect(state.items[123]).toEqual(item);
		});

		it('should use default getQueryKey with JSON.stringify', () => {
			const store = createStore({
				resource: mockResource,
			});

			const query = { q: 'search', status: 'active' };
			const expectedKey = JSON.stringify(query);
			const action = store.actions.receiveItems(expectedKey, [], {});

			expect(action).toHaveProperty('queryKey', expectedKey);
		});

		it('should use custom getId function', () => {
			const customGetId = (item: MockThing) => `thing-${item.id}`;
			const store = createStore({
				resource: mockResource,
				getId: customGetId,
			});

			const item = { id: 123, title: 'Test', status: 'active' };
			const state = store.reducer(
				undefined,
				store.actions.receiveItem(item)
			);

			expect(state.items['thing-123']).toEqual(item);
		});

		it('should use custom getQueryKey function', () => {
			const customGetQueryKey = (query?: MockThingQuery) =>
				`custom-${query?.q || 'all'}`;
			const store = createStore({
				resource: mockResource,
				getQueryKey: customGetQueryKey,
			});

			const expectedKey = 'custom-search';
			const action = store.actions.receiveItems(expectedKey, [], {});

			expect(action).toHaveProperty('queryKey', expectedKey);
		});
	});
});
