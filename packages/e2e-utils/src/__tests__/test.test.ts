/**
 * Unit tests for Playwright test fixture extension
 */

import type {
	Admin,
	Editor,
	PageUtils,
	RequestUtils,
} from '@wordpress/e2e-test-utils-playwright';
import type { Page } from '@playwright/test';
import type { KernelUtils } from '../types.js';

describe('test fixture', () => {
	let mockBase: { extend: jest.Mock };
	let mockCreateKernelUtils: jest.Mock;
	let mockKernelUtils: KernelUtils;

	beforeEach(() => {
		// Reset modules to get fresh imports
		jest.resetModules();

		// Create mocks
		mockBase = {
			extend: jest.fn().mockReturnValue({}),
		};

		mockKernelUtils = {
			resource: jest.fn(),
			store: jest.fn(),
			events: jest.fn(),
		} as unknown as KernelUtils;

		mockCreateKernelUtils = jest.fn().mockReturnValue(mockKernelUtils);

		// Mock the base test module
		jest.doMock('@wordpress/e2e-test-utils-playwright', () => ({
			test: mockBase,
			expect: {},
		}));

		// Mock createWPKernelUtils
		jest.doMock('../createWPKernelUtils.js', () => ({
			createWPKernelUtils: mockCreateKernelUtils,
		}));
	});

	afterEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	it('should extend base test with wpk fixture', async () => {
		// Import test module to trigger fixture registration
		await import('../test.js');

		expect(mockBase.extend).toHaveBeenCalledWith({
			kernel: expect.any(Function),
		});
	});

	it('should create wpk utils with all fixtures', async () => {
		// Import test module
		await import('../test.js');

		// Get the fixture function that was registered
		const extendCall = mockBase.extend.mock.calls[0];
		const fixtureConfig = extendCall[0];
		const kernelFixture = fixtureConfig.kernel;

		// Mock WordPress fixtures
		const mockPage = {} as Page;
		const mockRequestUtils = {} as RequestUtils;
		const mockAdmin = {} as Admin;
		const mockEditor = {} as Editor;
		const mockPageUtils = {} as PageUtils;
		const mockUse = jest.fn();

		// Call the wpk fixture function
		await kernelFixture(
			{
				page: mockPage,
				requestUtils: mockRequestUtils,
				admin: mockAdmin,
				editor: mockEditor,
				pageUtils: mockPageUtils,
			},
			mockUse
		);

		// Verify createWPKernelUtils was called with all fixtures
		expect(mockCreateKernelUtils).toHaveBeenCalledWith({
			page: mockPage,
			requestUtils: mockRequestUtils,
			admin: mockAdmin,
			editor: mockEditor,
			pageUtils: mockPageUtils,
		});

		// Verify the wpk utils were passed to use()
		expect(mockUse).toHaveBeenCalledWith(mockKernelUtils);
	});

	it('should export expect from Playwright', async () => {
		const module = await import('../test.js');

		expect(module.expect).toBeDefined();
	});

	it('should pass wpk utils to test', async () => {
		// Import test module
		await import('../test.js');

		// Get the fixture function
		const extendCall = mockBase.extend.mock.calls[0];
		const fixtureConfig = extendCall[0];
		const kernelFixture = fixtureConfig.kernel;

		// Mock fixtures with specific values
		const mockPage = { goto: jest.fn() } as unknown as Page;
		const mockRequestUtils = { rest: jest.fn() } as unknown as RequestUtils;
		const mockAdmin = { visitAdminPage: jest.fn() } as unknown as Admin;
		const mockEditor = { insertBlock: jest.fn() } as unknown as Editor;
		const mockPageUtils = {
			pressKeys: jest.fn(),
		} as unknown as PageUtils;

		let capturedKernel: KernelUtils | undefined;
		const mockUse = jest.fn(async (kernel) => {
			capturedKernel = kernel;
		});

		// Execute the fixture
		await kernelFixture(
			{
				page: mockPage,
				requestUtils: mockRequestUtils,
				admin: mockAdmin,
				editor: mockEditor,
				pageUtils: mockPageUtils,
			},
			mockUse
		);

		// Verify wpk was passed
		expect(capturedKernel).toBe(mockKernelUtils);
		expect(capturedKernel?.resource).toBeDefined();
		expect(capturedKernel?.store).toBeDefined();
		expect(capturedKernel?.events).toBeDefined();
	});

	it('should handle fixture cleanup', async () => {
		// Import test module
		await import('../test.js');

		// Get the fixture function
		const extendCall = mockBase.extend.mock.calls[0];
		const fixtureConfig = extendCall[0];
		const kernelFixture = fixtureConfig.kernel;

		// Mock minimal fixtures
		const mockPage = {} as Page;
		const mockRequestUtils = {} as RequestUtils;
		const mockAdmin = {} as Admin;
		const mockEditor = {} as Editor;
		const mockPageUtils = {} as PageUtils;

		let useCallbackExecuted = false;
		const mockUse = jest.fn(async () => {
			useCallbackExecuted = true;
		});

		// Execute the fixture
		await kernelFixture(
			{
				page: mockPage,
				requestUtils: mockRequestUtils,
				admin: mockAdmin,
				editor: mockEditor,
				pageUtils: mockPageUtils,
			},
			mockUse
		);

		// Verify use callback was executed (Playwright handles cleanup after)
		expect(useCallbackExecuted).toBe(true);
	});
});
