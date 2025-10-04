/**
 * Unit tests for defineResource - React Hooks
 *
 * Tests useGet and useList hooks that integrate with @wordpress/data
 */

import { defineResource } from '../define';

// Mock resource for testing
interface MockThing {
	id: number;
	title: string;
	status: string;
}

interface MockThingQuery {
	q?: string;
	status?: string;
}

// Use global types for window.wp

describe('defineResource - React Hooks', () => {
	let mockWpData: any;
	let originalWp: Window['wp'];

	beforeEach(() => {
		// Store original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		originalWp = windowWithWp?.wp;

		// Create mock wp.data
		mockWpData = {
			useSelect: jest.fn(),
			select: jest.fn(),
			dispatch: jest.fn(),
			resolveSelect: jest.fn(),
		};

		// Setup window.wp.data
		if (windowWithWp) {
			windowWithWp.wp = {
				data: mockWpData,
			};
		}
	});

	afterEach(() => {
		// Restore original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		if (windowWithWp) {
			windowWithWp.wp = originalWp;
		}
	});

	describe('useGet hook', () => {
		it('should throw error if @wordpress/data is not loaded', () => {
			// Remove wp.data
			(global.window as Window & { wp?: any }).wp = undefined;

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			expect(() => resource.useGet!(1)).toThrow(
				'useGet requires @wordpress/data to be loaded'
			);
		});

		it('should call useSelect with correct parameters', () => {
			const mockItem: MockThing = {
				id: 1,
				title: 'Thing One',
				status: 'active',
			};

			// Mock useSelect to return data
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getItem: jest.fn().mockReturnValue(mockItem),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getItemError: jest.fn().mockReturnValue(null),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			const result = resource.useGet!(1);

			expect(mockWpData.useSelect).toHaveBeenCalled();
			expect(result).toEqual({
				data: mockItem,
				isLoading: false,
				error: undefined,
			});
		});

		it('should indicate loading state correctly', () => {
			// Mock useSelect to return loading state
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getItem: jest.fn().mockReturnValue(undefined),
					isResolving: jest.fn().mockReturnValue(true),
					hasFinishedResolution: jest.fn().mockReturnValue(false),
					getItemError: jest.fn().mockReturnValue(null),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			const result = resource.useGet!(1);

			expect(result).toEqual({
				data: undefined,
				isLoading: true,
				error: undefined,
			});
		});

		it('should return error when present', () => {
			const mockError = { message: 'Not found' };

			// Mock useSelect to return error
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getItem: jest.fn().mockReturnValue(undefined),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getItemError: jest.fn().mockReturnValue(mockError),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			const result = resource.useGet!(1);

			expect(result).toEqual({
				data: undefined,
				isLoading: false,
				error: 'Not found',
			});
		});

		it('should be undefined when route not configured', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					// No get route
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			expect(resource.useGet).toBeUndefined();
		});
	});

	describe('useList hook', () => {
		it('should throw error if @wordpress/data is not loaded', () => {
			// Remove wp.data
			(global.window as Window & { wp?: any }).wp = undefined;

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			expect(() => resource.useList!()).toThrow(
				'useList requires @wordpress/data to be loaded'
			);
		});

		it('should call useSelect with correct parameters', () => {
			const mockItems: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
				{ id: 2, title: 'Thing Two', status: 'inactive' },
			];

			// Mock useSelect to return data
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(mockItems),
					getListStatus: jest.fn().mockReturnValue('success'),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getListError: jest.fn().mockReturnValue(null),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const result = resource.useList!();

			expect(mockWpData.useSelect).toHaveBeenCalled();
			expect(result).toEqual({
				data: mockItems,
				isLoading: false,
				error: null,
			});
		});

		it('should pass query parameter to useSelect', () => {
			const mockItems: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
			];
			const query: MockThingQuery = { status: 'active' };

			// Mock useSelect to return data
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(mockItems),
					getListStatus: jest.fn().mockReturnValue('success'),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getListError: jest.fn().mockReturnValue(null),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const result = resource.useList!(query);

			expect(mockWpData.useSelect).toHaveBeenCalled();
			expect(result).toEqual({
				data: mockItems,
				isLoading: false,
				error: null,
			});
		});

		it('should indicate loading state correctly', () => {
			// Mock useSelect to return loading state
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(undefined),
					getListStatus: jest.fn().mockReturnValue('loading'),
					isResolving: jest.fn().mockReturnValue(true),
					hasFinishedResolution: jest.fn().mockReturnValue(false),
					getListError: jest.fn().mockReturnValue(null),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const result = resource.useList!();

			expect(result).toEqual({
				data: undefined,
				isLoading: true,
				error: null,
			});
		});

		it('should return error when present', () => {
			const mockError = 'Server error';

			// Mock useSelect to return error
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(undefined),
					getListStatus: jest.fn().mockReturnValue('error'),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getListError: jest.fn().mockReturnValue(mockError),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const result = resource.useList!();

			expect(result).toEqual({
				data: undefined,
				isLoading: false,
				error: 'Server error',
			});
		});

		it('should be undefined when route not configured', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					// No list route
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			expect(resource.useList).toBeUndefined();
		});
	});
});
