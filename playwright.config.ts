import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for WP Kernel E2E tests
 * Targets wp-env tests site on port 8889
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	// Test directory
	testDir: './packages/e2e-utils/tests',

	// Run tests in files in parallel
	fullyParallel: true,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 0,

	// Opt out of parallel tests on CI (more stable)
	workers: process.env.CI ? 1 : undefined,

	// Reporter to use
	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['list'],
		...(process.env.CI ? [['github'] as const] : []),
	],

	// Shared settings for all the projects below
	use: {
		// Base URL to use in actions like `await page.goto('/')`
		baseURL: 'http://localhost:8889',

		// Collect trace when retrying the failed test
		trace: 'on-first-retry',

		// Screenshot on failure
		screenshot: 'only-on-failure',

		// Video on failure
		video: 'retain-on-failure',

		// Timeout for each action (e.g. click, fill)
		actionTimeout: 10000,
	},

	// Configure projects for major browsers
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},

		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},

		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},

		// Mobile viewports
		// {
		// 	name: 'Mobile Chrome',
		// 	use: { ...devices['Pixel 5'] },
		// },
		// {
		// 	name: 'Mobile Safari',
		// 	use: { ...devices['iPhone 12'] },
		// },
	],

	// Run your local dev server before starting the tests
	webServer: {
		command: 'pnpm wp:start',
		url: 'http://localhost:8889',
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000, // 2 minutes for Docker startup
		stdout: 'pipe',
		stderr: 'pipe',
	},

	// Global timeout for each test (60 seconds)
	timeout: 60 * 1000,

	// Expect timeout for assertions (10 seconds)
	expect: {
		timeout: 10 * 1000,
	},
});
