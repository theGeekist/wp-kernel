<?php
/**
 * Plugin Name: WP Kernel Showcase
 * Plugin URI: https://github.com/theGeekist/wp-kernel
 * Description: Demonstrates WP Kernel framework features using Script Modules and modern WordPress APIs
 * Version: 0.1.0
 * Requires at least: 6.7
 * Requires PHP: 8.3
 * Author: Geekist
 * Author URI: https://github.com/theGeekist
 * License: MIT
 * Text Domain: wp-kernel-showcase
 * Domain Path: /languages
 *
 * @package WPKernelShowcase
 */

namespace WPKernel\Showcase;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Plugin constants.
\define( 'WPK_SHOWCASE_VERSION', '0.1.0' );
\define( 'WPK_SHOWCASE_FILE', __FILE__ );
\define( 'WPK_SHOWCASE_PATH', \plugin_dir_path( __FILE__ ) );
\define( 'WPK_SHOWCASE_URL', \plugin_dir_url( __FILE__ ) );

/**
 * Initialize the plugin.
 *
 * Registers Script Modules and enqueues them with proper import maps.
 */
function init(): void {
	// Register the main module script.
	\wp_register_script_module(
		'@geekist/wp-kernel-showcase',
		WPK_SHOWCASE_URL . 'build/index.js',
		array(
			'@wordpress/interactivity',
			'@wordpress/dom-ready',
		),
		WPK_SHOWCASE_VERSION
	);

	// Enqueue on all pages for demonstration.
	\add_action(
		'wp_enqueue_scripts',
		function () {
			\wp_enqueue_script_module( '@geekist/wp-kernel-showcase' );
		}
	);

	// Also enqueue in admin for testing.
	\add_action(
		'admin_enqueue_scripts',
		function () {
			\wp_enqueue_script_module( '@geekist/wp-kernel-showcase' );
		}
	);
}

\add_action( 'init', __NAMESPACE__ . '\\init' );

/**
 * Activation hook.
 */
function activate(): void {
	// Flush rewrite rules on activation.
	\flush_rewrite_rules();
}

\register_activation_hook( __FILE__, __NAMESPACE__ . '\\activate' );

/**
 * Deactivation hook.
 */
function deactivate(): void {
	// Flush rewrite rules on deactivation.
	\flush_rewrite_rules();
}

\register_deactivation_hook( __FILE__, __NAMESPACE__ . '\\deactivate' );
