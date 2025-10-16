/**
 * Unit tests for createStore factory - Selectors
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

describe('createStore - Selectors', () => {
	let mockResource: ResourceObject<MockThing, MockThingQuery>;

	beforeEach(() => {
		({ resource: mockResource } = createMockResource());
	});

	describe('selectors', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;
		let stateWithData: ReturnType<typeof store.reducer>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});

			// Setup state with test data
			stateWithData = store.reducer(
				undefined,
				store.actions.receiveItems(
					'query1',
					[
						{ id: 1, title: 'Thing One', status: 'active' },
						{ id: 2, title: 'Thing Two', status: 'inactive' },
					],
					{ total: 2, hasMore: false }
				)
			);
		});

		it('should select item by ID', () => {
			const item = store.selectors.getItem(stateWithData, 1);

			expect(item).toEqual({
				id: 1,
				title: 'Thing One',
				status: 'active',
			});
		});

		it('should return undefined for non-existent item', () => {
			const item = store.selectors.getItem(stateWithData, 999);

			expect(item).toBeUndefined();
		});

		it('should select all items from a query', () => {
			// The data was stored with queryKey 'query1', need to use getItems with undefined query
			// getItems() with no query will use getQueryKey(undefined) which won't match 'query1'
			// Let's use a proper query setup
			const query = {};
			const queryKey = JSON.stringify(query);
			const stateWithQuery = store.reducer(
				undefined,
				store.actions.receiveItems(
					queryKey,
					[
						{ id: 1, title: 'Thing One', status: 'active' },
						{ id: 2, title: 'Thing Two', status: 'inactive' },
					],
					{ total: 2, hasMore: false }
				)
			);

			const items = store.selectors.getItems(stateWithQuery, query);

			expect(items).toHaveLength(2);
			expect(items[0]).toEqual({
				id: 1,
				title: 'Thing One',
				status: 'active',
			});
			expect(items[1]).toEqual({
				id: 2,
				title: 'Thing Two',
				status: 'inactive',
			});
		});

		it('should select list by query key', () => {
			// The data was stored with queryKey 'query1', so we need to query with that same key
			// Since getList uses getQueryKey internally, we need to understand what query produces 'query1'
			// For this test, let's re-setup with a proper query
			const query = { q: 'search' };
			const queryKey = JSON.stringify(query);
			const stateWithQuery = store.reducer(
				undefined,
				store.actions.receiveItems(
					queryKey,
					[
						{ id: 1, title: 'Thing One', status: 'active' },
						{ id: 2, title: 'Thing Two', status: 'inactive' },
					],
					{ total: 2, hasMore: false }
				)
			);

			const result = store.selectors.getList(stateWithQuery, query);

			expect(result.items).toEqual([
				{ id: 1, title: 'Thing One', status: 'active' },
				{ id: 2, title: 'Thing Two', status: 'inactive' },
			]);
			expect(result.total).toBe(2);
			expect(result.hasMore).toBe(false);
		});

		it('should return empty list for non-existent query', () => {
			const result = store.selectors.getList(stateWithData, {
				q: 'nonexistent',
			});

			expect(result.items).toEqual([]);
			expect(result.total).toBeUndefined();
		});

		it('should select error by cache key', () => {
			const stateWithError = store.reducer(
				undefined,
				store.actions.receiveError('thing:get:1', 'Not found')
			);

			const error = store.selectors.getError(
				stateWithError,
				'thing:get:1'
			);

			expect(error).toBe('Not found');
		});

		it('should return undefined for non-existent error', () => {
			const error = store.selectors.getError(
				stateWithData,
				'thing:get:999'
			);

			expect(error).toBeUndefined();
		});

		it('uses fallback cache key when list generator returns empty pattern', () => {
			mockResource.cacheKeys.list = () => [];
			const fallbackStore = createStore({
				resource: mockResource,
			});

			const query = { q: 'page-3' };
			const fallbackKey = `thing:list:${JSON.stringify(query)}`;
			const stateWithError = fallbackStore.reducer(
				undefined,
				fallbackStore.actions.receiveError(fallbackKey, 'List failed')
			);

			const error = fallbackStore.selectors.getListError(
				stateWithError,
				query
			);

			expect(error).toBe('List failed');
		});
	});

	describe('resolution tracking selectors (stubs)', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;
		let emptyState: ReturnType<typeof store.reducer>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});

			emptyState = store.reducer(undefined, { type: '@@INIT' });
		});

		it('should have isResolving stub that returns false', () => {
			expect(store.selectors.isResolving).toBeDefined();
			const result = store.selectors.isResolving(emptyState, 'getItem', [
				1,
			]);
			expect(result).toBe(false);
		});

		it('should have hasStartedResolution stub that returns false', () => {
			expect(store.selectors.hasStartedResolution).toBeDefined();
			const result = store.selectors.hasStartedResolution(
				emptyState,
				'getItem',
				[1]
			);
			expect(result).toBe(false);
		});

		it('should have hasFinishedResolution stub that returns false', () => {
			expect(store.selectors.hasFinishedResolution).toBeDefined();
			const result = store.selectors.hasFinishedResolution(
				emptyState,
				'getItem',
				[1]
			);
			expect(result).toBe(false);
		});
	});
});
