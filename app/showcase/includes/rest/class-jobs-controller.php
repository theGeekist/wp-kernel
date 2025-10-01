<?php
/**
 * Jobs REST Controller
 *
 * Handles REST API endpoints for Job Postings in the WP Kernel Showcase.
 *
 * @package WPKernelShowcase
 */

namespace WPKernel\Showcase\REST;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use WPKernel\Showcase\REST_Controller;

/**
 * Jobs REST Controller class.
 *
 * Provides endpoints for listing, retrieving, and managing job postings.
 */
class Jobs_Controller extends REST_Controller {
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
		// List jobs: GET /wpk/v1/jobs
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

		// Single job: GET /wpk/v1/jobs/:id
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
		// TODO: Replace with actual database query in Sprint 3.
		// For now, return static sample data matching job.schema.json.
		$jobs = $this->get_sample_jobs();

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

		// TODO: Replace with actual database query in Sprint 3.
		$jobs = $this->get_sample_jobs();
		$job  = null;

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
	 * Stub implementation - returns 501 Not Implemented.
	 * Will be implemented in Sprint 3.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_Error Error response.
	 */
	public function create_item( $request ) {
		return $this->get_error(
			'not_implemented',
			__( 'Creating job postings is not yet implemented. Coming in Sprint 3.', 'wp-kernel-showcase' ),
			501
		);
	}

	/**
	 * Update an existing job posting.
	 *
	 * Stub implementation - returns 501 Not Implemented.
	 * Will be implemented in Sprint 3.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_Error Error response.
	 */
	public function update_item( $request ) {
		return $this->get_error(
			'not_implemented',
			__( 'Updating job postings is not yet implemented. Coming in Sprint 3.', 'wp-kernel-showcase' ),
			501
		);
	}

	/**
	 * Delete a job posting.
	 *
	 * Stub implementation - returns 501 Not Implemented.
	 * Will be implemented in Sprint 3.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_Error Error response.
	 */
	public function delete_item( $request ) {
		return $this->get_error(
			'not_implemented',
			__( 'Deleting job postings is not yet implemented. Coming in Sprint 3.', 'wp-kernel-showcase' ),
			501
		);
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
				'status'         => 'open',
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
				'status'         => 'open',
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
				'status'         => 'open',
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
				'status'         => 'open',
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
				'status'         => 'open',
				'created_at'     => '2025-01-12T13:45:00Z',
				'updated_at'     => '2025-01-12T13:45:00Z',
			),
		);
	}
}
