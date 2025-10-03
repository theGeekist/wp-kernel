/**
 * Test Global Type Declarations
 *
 * Ambient declarations that extend global interfaces for WordPress test environment.
 * This file allows TypeScript to understand WordPress-specific global properties
 * without requiring local 'any' casts in test files.
 *
 * Uses the exact same @wordpress/data type as runtime - no drift.
 */
import type * as WPData from '@wordpress/data';

export {};

declare global {
	/**
	 * WordPress global type for data package access
	 * Available globally in all test files without imports
	 * Points to the exact same @wordpress/data type as runtime
	 */
	type WPGlobal = {
		wp?: {
			data?: typeof WPData;
		};
	};

	/**
	 * Extend Window interface with WordPress global properties
	 * This makes window.wp?.data properly typed in all test files
	 */
	interface Window extends WPGlobal {
		/**
		 * WP Kernel plugin data (set by wp_localize_script)
		 * Used by namespace detection from plugin headers
		 */
		wpKernelData?: {
			textDomain?: string;
			slug?: string;
		};
	}

	/**
	 * WP Kernel package data on globalThis
	 * Used by namespace detection and other kernel functionality
	 */
	interface GlobalThis {
		__WP_KERNEL_PACKAGE__?: {
			name?: string;
			version?: string;
		};
	}

	/**
	 * Safe accessor that works in browser & SSR contexts
	 * Available globally without imports - same type as runtime
	 *
	 * @return WordPress data package or undefined if not available
	 */
	function getWPData(): typeof WPData | undefined;
}
