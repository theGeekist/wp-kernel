/**
 * Unit tests for createStore factory - Actions
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

describe('createStore - Actions', () => {
	let mockResource: ResourceObject<MockThing, MockThingQuery>;

	beforeEach(() => {
		({ resource: mockResource } = createMockResource());
	});

	describe('actions', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});
		});

		it('should create receiveItem action', () => {
			const item: MockThing = {
				id: 1,
				title: 'Thing One',
				status: 'active',
			};
			const action = store.actions.receiveItem(item);

			expect(action).toEqual({
				type: 'RECEIVE_ITEM',
				item,
			});
		});

		it('should create receiveItems action', () => {
			const items: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
			];
			const queryKey = 'query1';
			const meta = { total: 1, hasMore: false };

			const action = store.actions.receiveItems(queryKey, items, meta);

			expect(action).toEqual({
				type: 'RECEIVE_ITEMS',
				queryKey,
				items,
				meta,
			});
		});

		it('should create receiveError action', () => {
			const cacheKey = 'thing:get:1';
			const error = 'Not found';

			const action = store.actions.receiveError(cacheKey, error);

			expect(action).toEqual({
				type: 'RECEIVE_ERROR',
				cacheKey,
				error,
			});
		});

		it('should create invalidate action', () => {
			const cacheKeys = ['query1', 'query2'];

			const action = store.actions.invalidate(cacheKeys);

			expect(action).toEqual({
				type: 'INVALIDATE',
				cacheKeys,
			});
		});

		it('should create invalidateAll action', () => {
			const action = store.actions.invalidateAll();

			expect(action).toEqual({
				type: 'INVALIDATE_ALL',
			});
		});
	});
});
