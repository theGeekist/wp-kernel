/**
 * Unit tests for createKernelUtils factory
 *
 */

import type { Page } from '@playwright/test';
import type {
	Admin,
	Editor,
	PageUtils,
	RequestUtils,
} from '@wordpress/e2e-test-utils-playwright';
import { createKernelUtils } from '../src/createKernelUtils.js';
import type { WordPressFixtures } from '../src/types.js';

describe('createKernelUtils', () => {
	let mockPage: jest.Mocked<Page>;
	let mockRequestUtils: jest.Mocked<RequestUtils>;
	let mockAdmin: jest.Mocked<Admin>;
	let mockEditor: jest.Mocked<Editor>;
	let mockPageUtils: jest.Mocked<PageUtils>;
	let fixtures: WordPressFixtures;

	beforeEach(() => {
		// Mock Page
		mockPage = {
			evaluate: jest.fn(),
			waitForTimeout: jest.fn(),
		} as unknown as jest.Mocked<Page>;

		// Mock RequestUtils
		mockRequestUtils = {
			rest: jest.fn(),
		} as unknown as jest.Mocked<RequestUtils>;

		// Mock Admin
		mockAdmin = {} as jest.Mocked<Admin>;

		// Mock Editor
		mockEditor = {} as jest.Mocked<Editor>;

		// Mock PageUtils
		mockPageUtils = {} as jest.Mocked<PageUtils>;

		fixtures = {
			page: mockPage,
			requestUtils: mockRequestUtils,
			admin: mockAdmin,
			editor: mockEditor,
			pageUtils: mockPageUtils,
		};
	});

	describe('factory initialization', () => {
		it('should create kernel utils with all helpers', () => {
			const kernel = createKernelUtils(fixtures);

			expect(kernel).toBeDefined();
			expect(kernel.resource).toBeInstanceOf(Function);
			expect(kernel.store).toBeInstanceOf(Function);
			expect(kernel.events).toBeInstanceOf(Function);
		});

		it('should return different instances for multiple calls', () => {
			const kernel1 = createKernelUtils(fixtures);
			const kernel2 = createKernelUtils(fixtures);

			expect(kernel1).not.toBe(kernel2);
		});
	});

	describe('resource helper factory', () => {
		it('should create resource utilities', () => {
			const kernel = createKernelUtils(fixtures);
			const resourceConfig = {
				name: 'test',
				routes: {
					create: { path: '/test', method: 'POST' },
				},
			};

			const resource = kernel.resource(resourceConfig);

			expect(resource).toBeDefined();
			expect(resource.seed).toBeInstanceOf(Function);
			expect(resource.seedMany).toBeInstanceOf(Function);
			expect(resource.remove).toBeInstanceOf(Function);
			expect(resource.deleteAll).toBeInstanceOf(Function);
		});

		it('should pass requestUtils to resource utilities', async () => {
			const kernel = createKernelUtils(fixtures);
			const resourceConfig = {
				name: 'test',
				routes: {
					create: { path: '/test', method: 'POST' },
				},
			};

			mockRequestUtils.rest.mockResolvedValue({ id: 1, title: 'Test' });

			const resource = kernel.resource(resourceConfig);
			await resource.seed({ title: 'Test' });

			expect(mockRequestUtils.rest).toHaveBeenCalledWith({
				path: '/test',
				method: 'POST',
				data: { title: 'Test' },
			});
		});
	});

	describe('store helper factory', () => {
		it('should create store utilities', () => {
			const kernel = createKernelUtils(fixtures);
			const store = kernel.store('wpk/test');

			expect(store).toBeDefined();
			expect(store.wait).toBeInstanceOf(Function);
			expect(store.invalidate).toBeInstanceOf(Function);
			expect(store.getState).toBeInstanceOf(Function);
		});

		it('should pass page to store utilities', async () => {
			const kernel = createKernelUtils(fixtures);
			const store = kernel.store('wpk/test');

			mockPage.evaluate.mockResolvedValue({ test: 'state' });

			const state = await store.getState();

			expect(mockPage.evaluate).toHaveBeenCalled();
			expect(state).toEqual({ test: 'state' });
		});
	});

	describe('event helper factory', () => {
		it('should create event utilities', async () => {
			const kernel = createKernelUtils(fixtures);

			mockPage.evaluate.mockResolvedValue(undefined);

			const events = await kernel.events();

			expect(events).toBeDefined();
			expect(events.list).toBeInstanceOf(Function);
			expect(events.find).toBeInstanceOf(Function);
			expect(events.findAll).toBeInstanceOf(Function);
			expect(events.clear).toBeInstanceOf(Function);
			expect(events.stop).toBeInstanceOf(Function);
		});

		it('should pass page to event utilities', async () => {
			const kernel = createKernelUtils(fixtures);

			mockPage.evaluate.mockResolvedValue(undefined);

			await kernel.events();

			expect(mockPage.evaluate).toHaveBeenCalled();
		});

		it('should pass options to event utilities', async () => {
			const kernel = createKernelUtils(fixtures);
			const pattern = /^wpk\.test\./;

			mockPage.evaluate.mockResolvedValue(undefined);

			await kernel.events({ pattern });

			expect(mockPage.evaluate).toHaveBeenCalledWith(
				expect.any(Function),
				pattern.source
			);
		});
	});

	describe('type safety', () => {
		it('should infer types from resource config', () => {
			interface TestResource {
				title: string;
				count: number;
			}

			const kernel = createKernelUtils(fixtures);
			const resource = kernel.resource<TestResource>({
				name: 'test',
				routes: {
					create: { path: '/test', method: 'POST' },
				},
			});

			// TypeScript should enforce types here
			// This is a compile-time test
			expect(resource.seed).toBeDefined();
		});

		it('should infer types from store key', () => {
			interface TestStore {
				getItems: () => string[];
			}

			const kernel = createKernelUtils(fixtures);
			const store = kernel.store<TestStore>('wpk/test');

			// TypeScript should enforce types here
			expect(store.wait).toBeDefined();
		});

		it('should infer types from event payload', async () => {
			interface TestPayload {
				id: number;
				data: string;
			}

			const kernel = createKernelUtils(fixtures);

			mockPage.evaluate.mockResolvedValue(undefined);

			const events = await kernel.events<TestPayload>();

			// TypeScript should enforce types here
			expect(events.list).toBeDefined();
		});
	});
});
