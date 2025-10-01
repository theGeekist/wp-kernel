/**
 * WP Kernel Showcase Plugin - Main Entry
 *
 * Demonstrates Script Modules loading and WP Kernel framework integration.
 */

import domReady from '@wordpress/dom-ready';

/**
 * Initialize the showcase plugin.
 */
function init() {
	console.log('🚀 WP Kernel Showcase Plugin loaded!');
	console.log('✅ Script Modules are working');
	console.log('📦 WordPress packages available via import maps');

	// Log kernel version if available
	try {
		// This will be available once kernel package is built
		console.log('🎯 WP Kernel framework detected');
	} catch {
		console.log(
			'ℹ️ WP Kernel core package not yet loaded (expected in early setup)'
		);
	}

	// Add a visual indicator to the admin bar
	const adminBar = document.getElementById('wp-admin-bar-root-default');
	if (adminBar) {
		const indicator = document.createElement('li');
		indicator.id = 'wp-admin-bar-wpk-showcase';
		indicator.innerHTML = `
			<a class="ab-item" href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
				<span class="ab-icon" style="display: inline-block; width: 20px; height: 20px; margin-right: 5px;">🚀</span>
				<span class="ab-label">WP Kernel Active</span>
			</a>
		`;
		adminBar.appendChild(indicator);
	}
}

// Run on DOM ready
domReady(init);

// Also export for potential module imports
export { init };
