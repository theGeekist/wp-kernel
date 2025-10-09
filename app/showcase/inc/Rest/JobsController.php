<?php
/**
 * Jobs REST Controller
 *
 * Handles REST API endpoints for Job Postings in the WP Kernel Showcase.
 *
 * @package WPKernelShowcase
 */

namespace WPKernel\Showcase\Rest;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use WPKernel\Showcase\Rest\Controller;

/**
 * Jobs REST controller generated from the `kernelConfig.resources.job` definition.
 * This working copy mirrors the generator output; customise behaviour here as needed.
 *
 * Provides endpoints for listing, retrieving, and managing job postings.
 */
class JobsController extends Controller {
	/**
	 * Resource name.
	 *
	 * @var string
	 */
	protected $rest_base = 'jobs';

	/**
	 * Register the routes for job postings.
	 */
	public function register_routes() {
		// List jobs: GET /wp-kernel-showcase/v1/jobs
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'get_items_permissions_check' ),
					'args'                => $this->get_collection_params(),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'create_item_permissions_check' ),
				),
				'schema' => array( $this, 'get_public_item_schema' ),
			)
		);

		// Single job: GET /wp-kernel-showcase/v1/jobs/:id
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
					'args'                => array(
						'id' => array(
							'description' => __( 'Unique identifier for the job posting.', 'wp-kernel-showcase' ),
							'type'        => 'integer',
							'required'    => true,
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_item' ),
					'permission_callback' => array( $this, 'delete_item_permissions_check' ),
				),
				'schema' => array( $this, 'get_public_item_schema' ),
			)
		);
	}

	/**
	 * Get a collection of job postings.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error Response object or error.
	 */
	public function get_items( $request ) {
		// Get jobs from transient (created via REST API).
		$jobs = get_transient( 'wpk_showcase_jobs' );
		
		// Fall back to sample data if no jobs in transient.
		if ( false === $jobs || empty( $jobs ) ) {
			$jobs = $this->get_sample_jobs();
		}

		// Apply _fields filtering.
		$filtered_jobs = array_map(
			function ( $job ) use ( $request ) {
				return $this->filter_response_by_fields( $job, $request );
			},
			$jobs
		);

		return new WP_REST_Response( $filtered_jobs, 200 );
	}

	/**
	 * Get a single job posting.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error Response object or error.
	 */
	public function get_item( $request ) {
		$id = (int) $request->get_param( 'id' );

		// Get jobs from transient first.
		$jobs = get_transient( 'wpk_showcase_jobs' );
		
		// Fall back to sample data if no jobs in transient.
		if ( false === $jobs || empty( $jobs ) ) {
			$jobs = $this->get_sample_jobs();
		}

		$job = null;

		foreach ( $jobs as $item ) {
			if ( $item['id'] === $id ) {
				$job = $item;
				break;
			}
		}

		if ( ! $job ) {
			return $this->get_error(
				'job_not_found',
				__( 'Job posting not found.', 'wp-kernel-showcase' ),
				404
			);
		}

		// Apply _fields filtering.
		$filtered_job = $this->filter_response_by_fields( $job, $request );

		return new WP_REST_Response( $filtered_job, 200 );
	}

	/**
	 * Create a new job posting.
	 *
	 * Creates a new job and stores it in transients for demonstration purposes.
	 * In production, this would store to a database table or custom post type.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function create_item( $request ) {
		// Get existing jobs from transient.
		$jobs = get_transient( 'wpk_showcase_jobs' );
		
		// Fall back to sample data if no jobs in transient.
		if ( false === $jobs || empty( $jobs ) ) {
			$jobs = $this->get_sample_jobs();
		}

		// Generate new ID.
		$max_id = 0;
		foreach ( $jobs as $job ) {
			if ( $job['id'] > $max_id ) {
				$max_id = $job['id'];
			}
		}
		$new_id = $max_id + 1;

		// Build the new job object.
		$now = gmdate( 'Y-m-d\TH:i:s\Z' );
		$new_job = array(
			'id'             => $new_id,
			'title'          => $request->get_param( 'title' ) ?? '',
			'description'    => $request->get_param( 'description' ) ?? '',
			'department'     => $request->get_param( 'department' ) ?? '',
			'location'       => $request->get_param( 'location' ) ?? '',
			'remote_policy'  => $request->get_param( 'remote_policy' ) ?? 'office',
			'job_type'       => $request->get_param( 'job_type' ) ?? 'full-time',
			'seniority'      => $request->get_param( 'seniority' ) ?? 'mid',
			'salary_min'     => $request->get_param( 'salary_min' ) ?? null,
			'salary_max'     => $request->get_param( 'salary_max' ) ?? null,
			'currency'       => $request->get_param( 'currency' ) ?? 'USD',
			'apply_deadline' => $request->get_param( 'apply_deadline' ) ?? null,
			'status'         => $request->get_param( 'status' ) ?? 'draft',
			'created_at'     => $now,
			'updated_at'     => $now,
		);

		// Add to jobs array.
		$jobs[] = $new_job;

		// Save to transient (expires in 1 hour, good for testing).
		set_transient( 'wpk_showcase_jobs', $jobs, HOUR_IN_SECONDS );

		// Return the new job.
		return new \WP_REST_Response( $new_job, 201 );
	}

	/**
	 * Update an existing job posting.
	 *
	 * Updates a job stored in transients for demonstration purposes.
	 * In production, this would update a database table or custom post type.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function update_item( $request ) {
		$id = $request->get_param( 'id' );

		// Get existing jobs from transient.
		$jobs = get_transient( 'wpk_showcase_jobs' );
		
		// Fall back to sample data if no jobs in transient.
		if ( false === $jobs || empty( $jobs ) ) {
			$jobs = $this->get_sample_jobs();
		}

		// Find the job to update.
		$job_index = null;
		foreach ( $jobs as $index => $job ) {
			if ( $job['id'] === (int) $id ) {
				$job_index = $index;
				break;
			}
		}

		if ( null === $job_index ) {
			return $this->get_error(
				'not_found',
				__( 'Job posting not found.', 'wp-kernel-showcase' ),
				404
			);
		}

		// Update the job (merge with existing data).
		$updated_job = array_merge(
			$jobs[ $job_index ],
			array_filter(
				array(
					'title'          => $request->get_param( 'title' ),
					'description'    => $request->get_param( 'description' ),
					'department'     => $request->get_param( 'department' ),
					'location'       => $request->get_param( 'location' ),
					'remote_policy'  => $request->get_param( 'remote_policy' ),
					'job_type'       => $request->get_param( 'job_type' ),
					'seniority'      => $request->get_param( 'seniority' ),
					'salary_min'     => $request->get_param( 'salary_min' ),
					'salary_max'     => $request->get_param( 'salary_max' ),
					'currency'       => $request->get_param( 'currency' ),
					'apply_deadline' => $request->get_param( 'apply_deadline' ),
					'status'         => $request->get_param( 'status' ),
				),
				fn( $value ) => null !== $value
			)
		);

		$updated_job['updated_at'] = gmdate( 'Y-m-d\TH:i:s\Z' );

		$jobs[ $job_index ] = $updated_job;

		// Save to transient.
		set_transient( 'wpk_showcase_jobs', $jobs, HOUR_IN_SECONDS );

		// Return the updated job.
		return new \WP_REST_Response( $updated_job, 200 );
	}

	/**
	 * Delete a job posting.
	 *
	 * Deletes a job from transients for demonstration purposes.
	 * In production, this would delete from a database table or custom post type.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function delete_item( $request ) {
		$id = $request->get_param( 'id' );

		// Get existing jobs from transient.
		$jobs = get_transient( 'wpk_showcase_jobs' );
		
		// Fall back to sample data if no jobs in transient.
		if ( false === $jobs || empty( $jobs ) ) {
			$jobs = $this->get_sample_jobs();
		}

		// Find the job to delete.
		$job_index = null;
		$deleted_job = null;
		foreach ( $jobs as $index => $job ) {
			if ( $job['id'] === (int) $id ) {
				$job_index = $index;
				$deleted_job = $job;
				break;
			}
		}

		if ( null === $job_index ) {
			return $this->get_error(
				'not_found',
				__( 'Job posting not found.', 'wp-kernel-showcase' ),
				404
			);
		}

		// Remove the job.
		array_splice( $jobs, $job_index, 1 );

		// Save to transient.
		set_transient( 'wpk_showcase_jobs', $jobs, HOUR_IN_SECONDS );

		// Return the deleted job with 200 status.
		return new \WP_REST_Response( $deleted_job, 200 );
	}

	/**
	 * Get collection parameters for list endpoint.
	 *
	 * @return array Collection parameters.
	 */
	public function get_collection_params(): array {
		return array(
			'_fields' => array(
				'description' => __( 'Limit response to specific fields. Supports dot notation for nested fields.', 'wp-kernel-showcase' ),
				'type'        => 'string',
			),
		);
	}

	/**
	 * Get the job posting schema.
	 *
	 * @return array Item schema.
	 */
	public function get_item_schema(): array {
		// TODO: Load from contracts/job.schema.json in Sprint 3.
		return array(
			'$schema'    => 'http://json-schema.org/draft-07/schema#',
			'title'      => 'Job Posting',
			'type'       => 'object',
			'properties' => array(
				'id'             => array(
					'description' => __( 'Unique identifier for the job posting.', 'wp-kernel-showcase' ),
					'type'        => 'integer',
					'readonly'    => true,
				),
				'title'          => array(
					'description' => __( 'Job title.', 'wp-kernel-showcase' ),
					'type'        => 'string',
				),
				'description'    => array(
					'description' => __( 'Full job description (Markdown or HTML).', 'wp-kernel-showcase' ),
					'type'        => 'string',
				),
				'department'     => array(
					'description' => __( 'Department name.', 'wp-kernel-showcase' ),
					'type'        => 'string',
				),
				'location'       => array(
					'description' => __( 'Primary office location.', 'wp-kernel-showcase' ),
					'type'        => 'string',
				),
				'remote_policy'  => array(
					'description' => __( 'Remote work policy.', 'wp-kernel-showcase' ),
					'type'        => 'string',
					'enum'        => array( 'office', 'hybrid', 'remote', 'remote-first' ),
				),
				'job_type'       => array(
					'description' => __( 'Employment type.', 'wp-kernel-showcase' ),
					'type'        => 'string',
					'enum'        => array( 'full-time', 'part-time', 'contract', 'internship' ),
				),
				'seniority'      => array(
					'description' => __( 'Seniority level.', 'wp-kernel-showcase' ),
					'type'        => 'string',
					'enum'        => array( 'junior', 'mid', 'senior', 'lead', 'principal' ),
				),
				'salary_min'     => array(
					'description' => __( 'Minimum annual salary in cents (USD).', 'wp-kernel-showcase' ),
					'type'        => 'integer',
				),
				'salary_max'     => array(
					'description' => __( 'Maximum annual salary in cents (USD).', 'wp-kernel-showcase' ),
					'type'        => 'integer',
				),
				'currency'       => array(
					'description' => __( 'Currency code (ISO 4217).', 'wp-kernel-showcase' ),
					'type'        => 'string',
					'default'     => 'USD',
				),
				'apply_deadline' => array(
					'description' => __( 'Application deadline (ISO 8601).', 'wp-kernel-showcase' ),
					'type'        => 'string',
					'format'      => 'date-time',
				),
				'status'         => array(
					'description' => __( 'Publishing status.', 'wp-kernel-showcase' ),
					'type'        => 'string',
					'enum'        => array( 'draft', 'open', 'closed', 'filled' ),
					'default'     => 'draft',
				),
				'created_at'     => array(
					'description' => __( 'Creation timestamp (ISO 8601).', 'wp-kernel-showcase' ),
					'type'        => 'string',
					'format'      => 'date-time',
					'readonly'    => true,
				),
				'updated_at'     => array(
					'description' => __( 'Last update timestamp (ISO 8601).', 'wp-kernel-showcase' ),
					'type'        => 'string',
					'format'      => 'date-time',
					'readonly'    => true,
				),
			),
		);
	}

	/**
	 * Get sample job postings for Sprint 1 demonstration.
	 *
	 * This is temporary data - will be replaced with database queries in Sprint 3.
	 *
	 * @return array Array of sample job postings.
	 */
	private function get_sample_jobs(): array {
		return array(
			array(
				'id'             => 1,
				'title'          => 'Senior WordPress Developer',
				'description'    => 'Build cutting-edge WordPress products using modern JavaScript frameworks.',
				'department'     => 'Engineering',
				'location'       => 'San Francisco, CA',
				'remote_policy'  => 'hybrid',
				'job_type'       => 'full-time',
				'seniority'      => 'senior',
				'salary_min'     => 12000000, // $120,000
				'salary_max'     => 16000000, // $160,000
				'currency'       => 'USD',
				'apply_deadline' => '2025-12-31T23:59:59Z',
				'status'         => 'publish',
				'created_at'     => '2025-01-15T10:00:00Z',
				'updated_at'     => '2025-01-15T10:00:00Z',
			),
			array(
				'id'             => 2,
				'title'          => 'Junior Frontend Engineer',
				'description'    => 'Join our team to build beautiful, accessible interfaces using React and Gutenberg.',
				'department'     => 'Engineering',
				'location'       => 'Remote',
				'remote_policy'  => 'remote-first',
				'job_type'       => 'full-time',
				'seniority'      => 'junior',
				'salary_min'     => 7000000, // $70,000
				'salary_max'     => 9000000, // $90,000
				'currency'       => 'USD',
				'apply_deadline' => '2025-11-30T23:59:59Z',
				'status'         => 'publish',
				'created_at'     => '2025-01-10T14:30:00Z',
				'updated_at'     => '2025-01-10T14:30:00Z',
			),
			array(
				'id'             => 3,
				'title'          => 'Lead Product Manager',
				'description'    => 'Define product strategy and work with engineering to deliver value to customers.',
				'department'     => 'Product',
				'location'       => 'New York, NY',
				'remote_policy'  => 'hybrid',
				'job_type'       => 'full-time',
				'seniority'      => 'lead',
				'salary_min'     => 15000000, // $150,000
				'salary_max'     => 20000000, // $200,000
				'currency'       => 'USD',
				'apply_deadline' => '2025-10-31T23:59:59Z',
				'status'         => 'publish',
				'created_at'     => '2025-01-05T09:15:00Z',
				'updated_at'     => '2025-01-12T16:45:00Z',
			),
			array(
				'id'             => 4,
				'title'          => 'DevOps Engineer',
				'description'    => 'Build and maintain our CI/CD pipeline and cloud infrastructure.',
				'department'     => 'Engineering',
				'location'       => 'Austin, TX',
				'remote_policy'  => 'remote',
				'job_type'       => 'full-time',
				'seniority'      => 'mid',
				'salary_min'     => 10000000, // $100,000
				'salary_max'     => 14000000, // $140,000
				'currency'       => 'USD',
				'apply_deadline' => '2025-09-30T23:59:59Z',
				'status'         => 'publish',
				'created_at'     => '2025-01-08T11:20:00Z',
				'updated_at'     => '2025-01-08T11:20:00Z',
			),
			array(
				'id'             => 5,
				'title'          => 'UX Designer',
				'description'    => 'Design intuitive user experiences for our WordPress products.',
				'department'     => 'Design',
				'location'       => 'Seattle, WA',
				'remote_policy'  => 'hybrid',
				'job_type'       => 'full-time',
				'seniority'      => 'mid',
				'salary_min'     => 9000000, // $90,000
				'salary_max'     => 12000000, // $120,000
				'currency'       => 'USD',
				'apply_deadline' => '2025-08-31T23:59:59Z',
				'status'         => 'publish',
				'created_at'     => '2025-01-12T13:45:00Z',
				'updated_at'     => '2025-01-12T13:45:00Z',
			),
		);
	}
}
