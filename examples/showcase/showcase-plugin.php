<?php
/**
 * Plugin Name: WP Kernel Showcase
 * Plugin URI: https://github.com/theGeekist/wp-kernel
 * Description: Comprehensive demonstration of WP Kernel framework capabilities through a jobs and applications management system
 * Version:           0.1.0
 * Requires at least: 6.7
 * Requires PHP:      8.1
 * Author: theGeekist
 * Author URI: https://github.com/theGeekist
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wp-kernel-showcase
 * Domain Path: /languages
 *
 * @package WPKernelShowcase
 */

namespace WPKernel\Showcase;

use WP_Query;
use WPKernel\Showcase\Rest\JobsController;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Plugin constants.
\define( 'WPK_SHOWCASE_VERSION', '0.6.0' );
\define( 'WPK_SHOWCASE_FILE', __FILE__ );
\define( 'WPK_SHOWCASE_PATH', \plugin_dir_path( __FILE__ ) );
\define( 'WPK_SHOWCASE_URL', \plugin_dir_url( __FILE__ ) );
\define( 'WPK_SHOWCASE_JOB_POST_TYPE', 'wpk_job' );
\define( 'WPK_SHOWCASE_JOB_CLOSED_STATUS', 'wpk_job_closed' );
\define(
	'WPK_SHOWCASE_JOB_POLICY_CAPS',
	array(
		'jobs.create' => array(
			'capability' => 'edit_posts',
			'appliesTo'  => 'resource',
		),
		'jobs.update' => array(
			'capability' => 'edit_post',
			'appliesTo'  => 'object',
		),
		'jobs.delete' => array(
			'capability' => 'delete_post',
			'appliesTo'  => 'object',
		),
	)
);

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

	$prefix_length = strlen( 'WPKernel\\Showcase\\' );
	$relative      = substr( $class, $prefix_length );
	$relative_path = str_replace( '\\', '/', $relative ) . '.php';
	$file          = WPK_SHOWCASE_PATH . 'inc/' . $relative_path;

	if ( file_exists( $file ) ) {
		require_once $file;
	}
}

\spl_autoload_register( __NAMESPACE__ . '\\autoload' );

/**
 * Register the showcase content types, taxonomies, meta fields, and custom statuses.
 */
function register_content_types(): void {
	register_post_type(
		WPK_SHOWCASE_JOB_POST_TYPE,
		array(
			'labels' => array(
				'name'               => __( 'Jobs', 'wp-kernel-showcase' ),
				'singular_name'      => __( 'Job', 'wp-kernel-showcase' ),
				'add_new'            => __( 'Add New', 'wp-kernel-showcase' ),
				'add_new_item'       => __( 'Add New Job', 'wp-kernel-showcase' ),
				'edit_item'          => __( 'Edit Job', 'wp-kernel-showcase' ),
				'new_item'           => __( 'New Job', 'wp-kernel-showcase' ),
				'view_item'          => __( 'View Job', 'wp-kernel-showcase' ),
				'view_items'         => __( 'View Jobs', 'wp-kernel-showcase' ),
				'all_items'          => __( 'All Jobs', 'wp-kernel-showcase' ),
				'menu_name'          => __( 'Jobs', 'wp-kernel-showcase' ),
			),
			'public'             => true,
			'show_ui'            => true,
			'show_in_menu'       => false,
			'supports'           => array( 'title', 'editor' ),
			'show_in_rest'       => true,
			'rest_base'          => 'jobs',
			'rest_namespace'     => 'wp-kernel-showcase/v1',
			'map_meta_cap'       => true,
			'has_archive'        => false,
			'rewrite'            => array( 'slug' => 'jobs' ),
		)
	);

	register_post_status(
		WPK_SHOWCASE_JOB_CLOSED_STATUS,
		array(
			'label'                     => __( 'Closed', 'wp-kernel-showcase' ),
			'public'                    => true,
			'show_in_admin_all_list'    => true,
			'show_in_admin_status_list' => true,
			'show_in_rest'              => true,
			'label_count'               => _n_noop( 'Closed (%s)', 'Closed (%s)', 'wp-kernel-showcase' ),
		)
	);

	register_taxonomy(
		'wpk_job_department',
		WPK_SHOWCASE_JOB_POST_TYPE,
		array(
			'labels'            => array(
				'name'          => __( 'Departments', 'wp-kernel-showcase' ),
				'singular_name' => __( 'Department', 'wp-kernel-showcase' ),
			),
			'public'           => true,
			'hierarchical'     => false,
			'show_admin_column' => true,
			'show_in_rest'     => true,
			'rest_base'        => 'job-departments',
		)
	);

	register_taxonomy(
		'wpk_job_location',
		WPK_SHOWCASE_JOB_POST_TYPE,
		array(
			'labels'            => array(
				'name'          => __( 'Locations', 'wp-kernel-showcase' ),
				'singular_name' => __( 'Location', 'wp-kernel-showcase' ),
			),
			'public'           => true,
			'hierarchical'     => false,
			'show_admin_column' => true,
			'show_in_rest'     => true,
			'rest_base'        => 'job-locations',
		)
	);

	$meta_definitions = array(
		'department'     => array(
			'type'              => 'string',
			'schema'            => array( 'type' => 'string' ),
			'sanitize_callback' => 'sanitize_text_field',
		),
		'location'       => array(
			'type'              => 'string',
			'schema'            => array( 'type' => 'string' ),
			'sanitize_callback' => 'sanitize_text_field',
		),
		'remote_policy'  => array(
			'type'   => 'string',
			'schema' => array(
				'type' => 'string',
				'enum' => array( 'office', 'hybrid', 'remote', 'remote-first' ),
			),
		),
		'job_type'       => array(
			'type'   => 'string',
			'schema' => array(
				'type' => 'string',
				'enum' => array( 'full-time', 'part-time', 'contract', 'internship' ),
			),
		),
		'seniority'      => array(
			'type'   => 'string',
			'schema' => array(
				'type' => 'string',
				'enum' => array( 'junior', 'mid', 'senior', 'lead', 'principal' ),
			),
		),
		'salary_min'     => array(
			'type'   => 'integer',
			'schema' => array( 'type' => 'integer' ),
		),
		'salary_max'     => array(
			'type'   => 'integer',
			'schema' => array( 'type' => 'integer' ),
		),
		'currency'       => array(
			'type'              => 'string',
			'schema'            => array(
				'type'    => 'string',
				'default' => 'USD',
			),
			'sanitize_callback' => 'sanitize_text_field',
		),
		'apply_deadline' => array(
			'type'   => 'string',
			'schema' => array(
				'type'   => 'string',
				'format' => 'date-time',
			),
		),
	);

	foreach ( $meta_definitions as $meta_key => $definition ) {
		$args = array(
			'type'         => $definition['type'],
			'single'       => true,
			'show_in_rest' => array(
				'schema' => $definition['schema'],
			),
			'auth_callback' => __NAMESPACE__ . '\meta_auth_callback',
		);

		if ( isset( $definition['sanitize_callback'] ) ) {
			$args['sanitize_callback'] = $definition['sanitize_callback'];
		}

		register_post_meta( WPK_SHOWCASE_JOB_POST_TYPE, $meta_key, $args );
	}
}

/**
 * Meta capability callback ensuring only job editors may mutate meta fields.
 */
function meta_auth_callback( bool $allowed, string $meta_key, int $post_id, int $user_id = 0, string $cap = '', array $caps = array() ): bool { // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
	unset( $allowed, $meta_key, $user_id, $cap, $caps );

	return current_user_can( 'edit_post', $post_id );
}

/**
 * Seed the showcase with sample job postings when none exist.
 */
function seed_sample_jobs(): void {
	$query = new WP_Query(
		array(
			'post_type'      => WPK_SHOWCASE_JOB_POST_TYPE,
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);

	if ( $query->have_posts() ) {
		return;
	}

	$jobs = array(
		array(
			'title'          => 'Senior WordPress Developer',
			'description'    => 'Build cutting-edge WordPress products using modern JavaScript frameworks.',
			'department'     => 'Engineering',
			'location'       => 'San Francisco, CA',
			'remote_policy'  => 'hybrid',
			'job_type'       => 'full-time',
			'seniority'      => 'senior',
			'salary_min'     => 12000000,
			'salary_max'     => 16000000,
			'currency'       => 'USD',
			'apply_deadline' => '2025-12-31T23:59:59Z',
			'status'         => 'publish',
			'created_at'     => '2025-01-15T10:00:00Z',
			'updated_at'     => '2025-01-15T10:00:00Z',
		),
		array(
			'title'          => 'Junior Frontend Engineer',
			'description'    => 'Join our team to build beautiful, accessible interfaces using React and Gutenberg.',
			'department'     => 'Engineering',
			'location'       => 'Remote',
			'remote_policy'  => 'remote-first',
			'job_type'       => 'full-time',
			'seniority'      => 'junior',
			'salary_min'     => 7000000,
			'salary_max'     => 9000000,
			'currency'       => 'USD',
			'apply_deadline' => '2025-11-30T23:59:59Z',
			'status'         => 'publish',
			'created_at'     => '2025-01-10T14:30:00Z',
			'updated_at'     => '2025-01-10T14:30:00Z',
		),
		array(
			'title'          => 'Lead Product Manager',
			'description'    => 'Define product strategy and work with engineering to deliver value to customers.',
			'department'     => 'Product',
			'location'       => 'New York, NY',
			'remote_policy'  => 'hybrid',
			'job_type'       => 'full-time',
			'seniority'      => 'lead',
			'salary_min'     => 15000000,
			'salary_max'     => 20000000,
			'currency'       => 'USD',
			'apply_deadline' => '2025-10-31T23:59:59Z',
			'status'         => 'publish',
			'created_at'     => '2025-01-05T09:15:00Z',
			'updated_at'     => '2025-01-12T16:45:00Z',
		),
		array(
			'title'          => 'DevOps Engineer',
			'description'    => 'Build and maintain our CI/CD pipeline and cloud infrastructure.',
			'department'     => 'Engineering',
			'location'       => 'Austin, TX',
			'remote_policy'  => 'remote',
			'job_type'       => 'full-time',
			'seniority'      => 'mid',
			'salary_min'     => 10000000,
			'salary_max'     => 14000000,
			'currency'       => 'USD',
			'apply_deadline' => '2025-09-30T23:59:59Z',
			'status'         => 'publish',
			'created_at'     => '2025-01-08T11:20:00Z',
			'updated_at'     => '2025-01-08T11:20:00Z',
		),
		array(
			'title'          => 'UX Designer',
			'description'    => 'Design intuitive user experiences for our WordPress products.',
			'department'     => 'Design',
			'location'       => 'Seattle, WA',
			'remote_policy'  => 'hybrid',
			'job_type'       => 'full-time',
			'seniority'      => 'mid',
			'salary_min'     => 9000000,
			'salary_max'     => 12000000,
			'currency'       => 'USD',
			'apply_deadline' => '2025-08-31T23:59:59Z',
			'status'         => 'publish',
			'created_at'     => '2025-01-12T13:45:00Z',
			'updated_at'     => '2025-01-12T13:45:00Z',
		),
	);

	foreach ( $jobs as $job ) {
		$post_status = $job['status'];
		if ( 'closed' === $post_status ) {
			$post_status = WPK_SHOWCASE_JOB_CLOSED_STATUS;
		}

		$created_gmt = gmdate( 'Y-m-d H:i:s', strtotime( $job['created_at'] ?? 'now' ) );
		$updated_gmt = gmdate( 'Y-m-d H:i:s', strtotime( $job['updated_at'] ?? ( $job['created_at'] ?? 'now' ) ) );

		$post_id = wp_insert_post(
			array(
				'post_type'         => WPK_SHOWCASE_JOB_POST_TYPE,
				'post_title'        => $job['title'],
				'post_content'      => $job['description'] ?? '',
				'post_status'       => $post_status,
				'post_author'       => get_current_user_id() ?: 0,
				'post_date_gmt'     => $created_gmt,
				'post_modified_gmt' => $updated_gmt,
			),
			true
		);

		if ( is_wp_error( $post_id ) ) {
			continue;
		}

		$meta_keys = array( 'department', 'location', 'remote_policy', 'job_type', 'seniority', 'salary_min', 'salary_max', 'currency', 'apply_deadline' );
		foreach ( $meta_keys as $meta_key ) {
			if ( array_key_exists( $meta_key, $job ) && null !== $job[ $meta_key ] ) {
				update_post_meta( $post_id, $meta_key, $job[ $meta_key ] );
			}
		}

		if ( ! empty( $job['department'] ) ) {
			wp_set_object_terms( $post_id, array( $job['department'] ), 'wpk_job_department', false );
		}

		if ( ! empty( $job['location'] ) ) {
			wp_set_object_terms( $post_id, array( $job['location'] ), 'wpk_job_location', false );
		}
	}
}

/**
 * Get the entry file from Vite manifest.
 *
 * @return string Entry file path relative to build directory.
 */
function get_vite_entry_file(): string {
	static $entry_file = null;

	if ( null !== $entry_file ) {
		return $entry_file;
	}

	$manifest_path = WPK_SHOWCASE_PATH . 'build/manifest.json';

	if ( ! file_exists( $manifest_path ) ) {
		// Fallback to default if manifest doesn't exist (dev mode).
		$entry_file = 'index.js';
		return $entry_file;
	}

	$manifest = json_decode( file_get_contents( $manifest_path ), true );

	if ( isset( $manifest['src/index.ts']['file'] ) ) {
		$entry_file = $manifest['src/index.ts']['file'];
	} else {
		// Fallback to default.
		$entry_file = 'index.js';
	}

	return $entry_file;
}

/**
 * Initialize the plugin.
 *
 * Registers Script Modules and enqueues them with proper import maps.
 */
function init(): void {
	// Register the main showcase script once.
	\wp_register_script(
		'wp-kernel-showcase',
		WPK_SHOWCASE_URL . 'build/' . get_vite_entry_file(),
		array(
			'react',
			'react-dom',
			'wp-element',
			'wp-components',
			'wp-data',
			'wp-i18n',
			'wp-api-fetch',
			'wp-hooks',
		),
		WPK_SHOWCASE_VERSION,
		true
	);

	// Enqueue on the front-end for demonstration.
	\add_action(
		'wp_enqueue_scripts',
		function () {
			\wp_enqueue_script( 'wp-kernel-showcase' );
		}
	);

	// Enqueue in admin as a classic script; script modules + admin still have layout issues.
	\add_action(
		'admin_enqueue_scripts',
		function () {
			\wp_enqueue_script( 'wp-kernel-showcase' );
		}
	);
}

\add_action( 'init', __NAMESPACE__ . '\\register_content_types', 0 );
\add_action( 'init', __NAMESPACE__ . '\\init' );

/**
 * Register admin menu and pages.
 */
function register_admin_menu(): void {
	\add_menu_page(
		__( 'Jobs', 'wp-kernel-showcase' ),
		__( 'Jobs', 'wp-kernel-showcase' ),
		'manage_options',
		'wpk-jobs',
		__NAMESPACE__ . '\\render_admin_page',
		'dashicons-businessman',
		30
	);
}

\add_action( 'admin_menu', __NAMESPACE__ . '\\register_admin_menu' );

/**
 * Render the admin page.
 *
 * Prints the React mount point. The Script Module detects it and loads the admin UI.
 * This is the minimal PHP that Sprint 5's mountAdmin() will replace.
 */
function render_admin_page(): void {
	// Print the mount point for React.
	// The main script module will detect this and dynamically import admin UI.
	echo '<div id="wpk-admin-root"></div>';
}

/**
 * Register REST API routes.
 */
function register_rest_routes(): void {
	$controllers = array(
		new JobsController( WPK_SHOWCASE_JOB_POLICY_CAPS ),
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
	register_content_types();
	seed_sample_jobs();
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
