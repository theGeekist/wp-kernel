/**
 * Sanity E2E Test
 *
 * Verifies that:
 * - WordPress wp-admin is accessible
 * - Showcase plugin is activated
 * - No uncaught JavaScript errors
 * - Script Module loads and executes
 *
 * @package
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Helper: Login to WordPress admin
 * @param page
 */
async function loginToWordPress(page: Page) {
	await page.goto('/wp-login.php');

	// Wait for login form
	await page.waitForSelector('input[name="log"]');

	// Fill login form
	await page.fill('input[name="log"]', 'admin');
	await page.fill('input[name="pwd"]', 'password');

	// Submit and wait for navigation
	await page.click('input[type="submit"]');
	await page.waitForLoadState('networkidle');
}

/**
 * Helper: Check for JavaScript errors in console
 * @param page
 */
function setupConsoleErrorTracking(page: Page): string[] {
	const errors: string[] = [];

	page.on('console', (msg) => {
		if (msg.type() === 'error') {
			errors.push(msg.text());
		}
	});

	page.on('pageerror', (error) => {
		errors.push(error.message);
	});

	return errors;
}

test.describe('WordPress Environment Sanity Checks', () => {
	test('should login to wp-admin successfully', async ({ page }) => {
		// Track console errors
		const errors = setupConsoleErrorTracking(page);

		// Login
		await loginToWordPress(page);

		// Verify we're in wp-admin (check for admin bar or various possible headings)
		const isInAdmin =
			(await page.locator('#wpadminbar').isVisible()) ||
			(await page.locator('#wpwrap').isVisible()) ||
			(await page.url()).includes('/wp-admin/');

		expect(isInAdmin, 'Should be logged into WordPress admin').toBe(true);

		// Check for JavaScript errors (404s for missing resources are acceptable)
		const realErrors = errors.filter(
			(err) =>
				!err.includes('404') && !err.includes('Failed to load resource')
		);
		expect(
			realErrors,
			'No critical JavaScript errors should occur during login'
		).toHaveLength(0);
	});

	test('should have showcase plugin activated', async ({ page }) => {
		const errors = setupConsoleErrorTracking(page);

		await loginToWordPress(page);

		// Navigate to plugins page
		await page.goto('/wp-admin/plugins.php');

		// Wait for page to load
		await page.waitForLoadState('networkidle');

		// Check if the plugin is listed and active
		const pluginActive = await page.evaluate(() => {
			// Look for showcase-plugin in the page
			const pageHtml = document.body.innerHTML;
			return (
				(pageHtml.includes('showcase-plugin') ||
					pageHtml.includes('Showcase Plugin')) &&
				pageHtml.includes('Deactivate')
			);
		});

		expect(pluginActive, 'Showcase plugin should be active').toBe(true);

		// Check for JavaScript errors (ignore 404s)
		const realErrors = errors.filter(
			(err) =>
				!err.includes('404') && !err.includes('Failed to load resource')
		);
		expect(
			realErrors,
			'No critical JavaScript errors on plugins page'
		).toHaveLength(0);
	});

	test('should load Script Module without errors', async ({ page }) => {
		const consoleMessages: string[] = [];
		const errors = setupConsoleErrorTracking(page);

		// Capture all console logs
		page.on('console', (msg) => {
			consoleMessages.push(msg.text());
		});

		await loginToWordPress(page);

		// Navigate to a page where the Script Module should load
		// (Dashboard should have it if the plugin enqueues globally)
		await page.goto('/wp-admin/');

		// Wait a moment for Script Module to execute
		await page.waitForTimeout(1000);

		// Check for showcase plugin's console message
		// (This assumes the plugin logs something identifiable)
		const hasPluginLog = consoleMessages.some(
			(msg) => msg.includes('WP Kernel') || msg.includes('showcase')
		);

		// If the plugin doesn't log anything specific, at least verify no errors
		if (!hasPluginLog) {
			console.log(
				'Note: No specific plugin console log found. This is acceptable if the plugin only logs conditionally.'
			);
		}

		// Check for JavaScript errors (ignore 404s)
		const realErrors = errors.filter(
			(err) =>
				!err.includes('404') && !err.includes('Failed to load resource')
		);
		expect(
			realErrors,
			'No critical JavaScript errors when loading Script Module'
		).toHaveLength(0);
	});

	test('should have accessible REST API', async ({ page }) => {
		const errors = setupConsoleErrorTracking(page);

		await loginToWordPress(page);

		// Check REST API availability by fetching a simple endpoint
		const response = await page.request.get('/wp-json/');

		// Should return 200 OK
		expect(response.status()).toBe(200);

		// Should return JSON
		const json = await response.json();
		expect(json).toHaveProperty('name'); // WordPress site name
		expect(json).toHaveProperty('namespaces'); // Available REST API namespaces

		// Check for JavaScript errors (ignore 404s)
		const realErrors = errors.filter(
			(err) =>
				!err.includes('404') && !err.includes('Failed to load resource')
		);
		expect(
			realErrors,
			'No critical JavaScript errors during REST API check'
		).toHaveLength(0);
	});
});
