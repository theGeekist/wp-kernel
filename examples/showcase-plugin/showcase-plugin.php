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
 * Autoload classes.
 *
 * @param string $class Class name.
 */
function autoload( string $class ): void {
	// Only autoload classes in our namespace.
	if ( strpos( $class, 'WPKernel\\Showcase\\' ) !== 0 ) {
		return;
	}

	// Convert namespace to file path.
	$class = str_replace( 'WPKernel\\Showcase\\', '', $class );
	$class = str_replace( '\\', '/', $class );
	$file  = WPK_SHOWCASE_PATH . 'includes/class-' . strtolower( str_replace( '_', '-', $class ) ) . '.php';

	// Handle nested namespaces (e.g., REST\Jobs_Controller).
	if ( strpos( $class, '/' ) !== false ) {
		$parts = explode( '/', $class );
		$class = array_pop( $parts );
		$path  = strtolower( implode( '/', $parts ) );
		$file  = WPK_SHOWCASE_PATH . 'includes/' . $path . '/class-' . strtolower( str_replace( '_', '-', $class ) ) . '.php';
	}

	if ( file_exists( $file ) ) {
		require_once $file;
	}
}

\spl_autoload_register( __NAMESPACE__ . '\\autoload' );

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
 * Register REST API routes.
 */
function register_rest_routes(): void {
	$controllers = array(
		new REST\Jobs_Controller(),
	);

	foreach ( $controllers as $controller ) {
		$controller->register_routes();
	}
}

\add_action( 'rest_api_init', __NAMESPACE__ . '\\register_rest_routes' );

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
