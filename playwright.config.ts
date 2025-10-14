import { defineConfig, devices } from '@playwright/test';

/**
 * Determine test environment: 'wp-env' (default) or 'playground'
 * Set via TEST_ENV environment variable
 */
const TEST_ENV = (process.env.TEST_ENV || 'wp-env') as 'wp-env' | 'playground';

/**
 * Environment-specific configuration
 */
const ENV_CONFIG = {
	'wp-env': {
		baseURL: 'http://localhost:8889',
		webServerCommand: 'pnpm wp:start',
		webServerTimeout: 120 * 1000, // 2 minutes for Docker startup
		autoStart: true, // wp-env can be auto-started (exits after starting)
	},
	playground: {
		baseURL: 'http://127.0.0.1:9400', // Match Playground's actual output (uses 127.0.0.1 not localhost)
		webServerCommand: 'pnpm playground',
		webServerTimeout: 60 * 1000, // 1 minute for Playground startup
		autoStart: false, // Playground runs in foreground, must be started manually
	},
};

const config = ENV_CONFIG[TEST_ENV];

/**
 * Playwright configuration for WP Kernel E2E tests
 * Supports both wp-env (Docker) and WP Playground environments
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	// Test directory - showcase e2e tests
	testDir: './examples/showcase/__tests__/e2e',

	// Only pick up Playwright-style specs (avoid Jest-style *.test.ts files)
	testMatch: /.*\.spec\.[jt]sx?$/,

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
		['html', { outputFolder: 'playwright-report', open: 'never' }],
		['list'],
		...(process.env.CI ? [['github'] as const] : []),
	],

	// Shared settings for all the projects below
	use: {
		// Base URL to use in actions like `await page.goto('/')`
		baseURL: config.baseURL,

		// Collect trace when retrying the failed test
		trace: 'on-first-retry',

		// Screenshot on failure
		screenshot: 'only-on-failure',

		// Video on failure
		video: 'retain-on-failure',

		// Timeout for each action (e.g. click, fill) - increased for CI
		actionTimeout: 15000,

		// Navigation timeout - increased for slow CI environments
		navigationTimeout: 30000,
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
	// Note: Playground must be started manually (it runs in foreground)
	// wp-env can be auto-started (it daemonizes after starting)
	...(process.env.CI || !config.autoStart
		? {}
		: {
				webServer: {
					command: config.webServerCommand,
					url: config.baseURL,
					reuseExistingServer: true,
					timeout: config.webServerTimeout,
					stdout: 'pipe',
					stderr: 'pipe',
				},
			}),

	// Global timeout for each test (60 seconds)
	timeout: 60 * 1000,

	// Expect timeout for assertions (10 seconds)
	expect: {
		timeout: 10 * 1000,
	},
});
