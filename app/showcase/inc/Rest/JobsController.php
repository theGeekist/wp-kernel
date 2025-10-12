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
use WP_Post;
use WP_Query;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Jobs REST controller generated from the `kernelConfig.resources.job` definition.
 * This working copy mirrors the generator output; customise behaviour here as needed.
 *
 * Provides endpoints for listing, retrieving, and managing job postings using the
 * custom post type registered by the showcase plugin.
 */
class JobsController extends Controller {
	/**
	 * REST base for resources.
	 *
	 * @var string
	 */
	protected $rest_base = 'jobs';

	/**
	 * Registered post type slug.
	 *
	 * @var string
	 */
	private string $post_type = 'wpk_job';

	/**
	 * Post meta fields that are persisted for jobs.
	 *
	 * @var array<string, string>
	 */
	private array $meta_fields = array(
		'department'     => 'string',
		'location'       => 'string',
		'remote_policy'  => 'string',
		'job_type'       => 'string',
		'seniority'      => 'string',
		'salary_min'     => 'integer',
		'salary_max'     => 'integer',
		'currency'       => 'string',
		'apply_deadline' => 'string',
	);

	/**
	 * Mapping of request parameters to taxonomies.
	 *
	 * @var array<string, string>
	 */
	private array $taxonomy_map = array(
		'department' => 'wpk_job_department',
		'location'   => 'wpk_job_location',
	);

	/**
	 * Map of exposed status values to WordPress post statuses.
	 *
	 * @var array<string, string>
	 */
	private array $status_map = array(
		'draft'   => 'draft',
		'publish' => 'publish',
		'closed'  => 'wpk_job_closed',
	);

	/**
	 * Policy capability definitions keyed by policy identifier.
	 *
	 * @var array<string, array{capability:string, appliesTo?:string}>
	 */
	private array $policy_caps;

	/**
	 * Constructor.
	 *
	 * @param array<string, array{capability:string, appliesTo?:string}> $policy_caps Policy map from kernel config.
	 */
	public function __construct( array $policy_caps = array() ) {
		$this->policy_caps = $policy_caps;
	}

	/**
	 * Register the routes for job postings.
	 */
	public function register_routes() {
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
					'args'                => $this->get_endpoint_args_for_item_schema( WP_REST_Server::CREATABLE ),
				),
				'schema' => array( $this, 'get_public_item_schema' ),
			)
		);

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
					'args'                => $this->get_update_args(),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_item' ),
					'permission_callback' => array( $this, 'delete_item_permissions_check' ),
					'args'                => array(
						'id' => array(
							'description' => __( 'Unique identifier for the job posting.', 'wp-kernel-showcase' ),
							'type'        => 'integer',
							'required'    => true,
						),
					),
				),
				'schema' => array( $this, 'get_public_item_schema' ),
			)
		);
	}

	/**
	 * Collection params merged into route args.
	 *
	 * @return array
	 */
	private function get_update_args(): array {
		$args           = $this->get_endpoint_args_for_item_schema( WP_REST_Server::EDITABLE );
		$args['id']     = array(
			'description' => __( 'Unique identifier for the job posting.', 'wp-kernel-showcase' ),
			'type'        => 'integer',
			'required'    => true,
		);
		return $args;
	}

	/**
	 * Get a collection of job postings.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error Response object or error.
	 */
	public function get_items( $request ) {
		$per_page = (int) $request->get_param( 'per_page' );
		if ( $per_page <= 0 ) {
			$per_page = 10;
		} elseif ( $per_page > 50 ) {
			$per_page = 50;
		}

		$paged = (int) $request->get_param( 'cursor' );
		if ( $paged <= 0 ) {
			$paged = 1;
		}

		$args = array(
			'post_type'      => $this->post_type,
			'post_status'    => $this->resolve_statuses_for_query( $request->get_param( 'status' ) ),
			'posts_per_page' => $per_page,
			'paged'          => $paged,
			'orderby'        => 'date',
			'order'          => 'DESC',
			'fields'         => 'ids',
		);

		$search = $request->get_param( 'q' );
		if ( is_string( $search ) && '' !== trim( $search ) ) {
			$args['s'] = sanitize_text_field( $search );
		}

		$tax_query = array();
		foreach ( $this->taxonomy_map as $param => $taxonomy ) {
			$value = $request->get_param( $param );
			if ( ! is_string( $value ) || '' === trim( $value ) ) {
				continue;
			}

			$tax_query[] = array(
				'taxonomy' => $taxonomy,
				'field'    => 'slug',
				'terms'    => sanitize_title( $value ),
			);
		}

		if ( ! empty( $tax_query ) ) {
			$args['tax_query'] = $tax_query;
		}

		$query = new WP_Query( $args );

		$items = array();

		foreach ( $query->posts as $post_id ) {
			$post = get_post( (int) $post_id );
			if ( ! $post ) {
				continue;
			}

			$items[] = $this->filter_response_by_fields(
				$this->prepare_item_data( $post ),
				$request
			);
		}

		$response = array(
			'items'      => $items,
			'total'      => (int) $query->found_posts,
			'hasMore'    => $query->max_num_pages > $paged,
			'nextCursor' => $query->max_num_pages > $paged ? (string) ( $paged + 1 ) : null,
		);

	return rest_ensure_response( $response );
}

	/**
	 * Verify a capability defined in the kernel configuration.
	 *
	 * @param string   $policy_key Policy identifier.
	 * @param int|null $object_id  Related object identifier (if applicable).
	 * @return bool|WP_Error
	 */
	private function check_capability( string $policy_key, ?int $object_id = null ) {
		if ( ! isset( $this->policy_caps[ $policy_key ] ) ) {
			return true;
		}

		$definition = $this->policy_caps[ $policy_key ];
		$capability = $definition['capability'] ?? '';
		$scope      = $definition['appliesTo'] ?? 'resource';

		if ( '' === $capability ) {
			return true;
		}

		$allowed = ( 'object' === $scope && null !== $object_id )
			? current_user_can( $capability, $object_id )
			: current_user_can( $capability );

		if ( ! $allowed ) {
			return $this->get_error(
				'forbidden',
				__( 'You are not allowed to perform this action.', 'wp-kernel-showcase' ),
				403
			);
		}

		return true;
	}

	/**
	 * Permissions check for creating job postings.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return bool|WP_Error
	 */
	public function create_item_permissions_check( $request ) {
		return $this->check_capability( 'jobs.create' );
	}

	/**
	 * Get a single job posting.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error Response object or error.
	 */
	public function get_item( $request ) {
		$post = $this->get_job_post( (int) $request->get_param( 'id' ) );

		if ( ! $post ) {
			return $this->get_error(
				'job_not_found',
				__( 'Job posting not found.', 'wp-kernel-showcase' ),
				404
			);
		}

		return $this->prepare_item_for_response( $post, $request );
	}

	/**
	 * Create a new job posting.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function create_item( $request ) {
		$prepared = $this->prepare_post_data( $request );

		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}

		list( $post_data, $meta, $taxonomies ) = $prepared;

		$post_id = wp_insert_post( $post_data, true );

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		$this->update_meta( $post_id, $meta );
		$this->sync_taxonomies( $post_id, $taxonomies );

		$post = get_post( $post_id );

		if ( ! $post ) {
			return $this->get_error(
				'post_create_failed',
				__( 'Job posting could not be retrieved after creation.', 'wp-kernel-showcase' ),
				500
			);
		}

		return $this->prepare_item_for_response( $post, $request, 201 );
	}

	/**
	 * Update an existing job posting.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function update_item( $request ) {
		$post = $this->get_job_post( (int) $request->get_param( 'id' ) );

		if ( ! $post ) {
			return $this->get_error(
				'job_not_found',
				__( 'Job posting not found.', 'wp-kernel-showcase' ),
				404
			);
		}

		$prepared = $this->prepare_post_data( $request, (int) $post->ID );

		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}

		list( $post_data, $meta, $taxonomies ) = $prepared;

		$result = wp_update_post( $post_data, true );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$this->update_meta( $post->ID, $meta );
		$this->sync_taxonomies( $post->ID, $taxonomies );

		$updated = $this->get_job_post( (int) $post->ID );

		if ( ! $updated ) {
			return $this->get_error(
				'post_update_failed',
				__( 'Job posting could not be retrieved after update.', 'wp-kernel-showcase' ),
				500
			);
		}

		return $this->prepare_item_for_response( $updated, $request );
	}

	/**
	 * Delete a job posting.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function delete_item( $request ) {
		$post = $this->get_job_post( (int) $request->get_param( 'id' ) );

		if ( ! $post ) {
			return $this->get_error(
				'job_not_found',
				__( 'Job posting not found.', 'wp-kernel-showcase' ),
				404
			);
		}

		$previous = $this->prepare_item_data( $post );

		$result = wp_delete_post( $post->ID, true );

		if ( ! $result ) {
			return $this->get_error(
				'delete_failed',
				__( 'Failed to delete job posting.', 'wp-kernel-showcase' ),
				500
			);
		}

		$response = array(
			'deleted'  => true,
			'previous' => $this->filter_response_by_fields( $previous, $request ),
		);

		return rest_ensure_response( $response );
	}

	/**
	 * Permissions check for updating job postings.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return bool|WP_Error
	 */
	public function update_item_permissions_check( $request ) {
		$post = $this->get_job_post( (int) $request->get_param( 'id' ) );

		if ( ! $post ) {
			return $this->get_error(
				'job_not_found',
				__( 'Job posting not found.', 'wp-kernel-showcase' ),
				404
			);
		}

	return $this->check_capability( 'jobs.update', (int) $post->ID );
	}

	/**
	 * Permissions check for deleting job postings.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return bool|WP_Error
	 */
	public function delete_item_permissions_check( $request ) {
		$post = $this->get_job_post( (int) $request->get_param( 'id' ) );

		if ( ! $post ) {
			return $this->get_error(
				'job_not_found',
				__( 'Job posting not found.', 'wp-kernel-showcase' ),
				404
			);
		}

	return $this->check_capability( 'jobs.delete', (int) $post->ID );
	}

	/**
	 * Prepare collection parameters.
	 *
	 * @return array
	 */
	public function get_collection_params(): array {
		return array(
			'_fields'    => array(
				'description' => __( 'Limit response to specific fields. Supports dot notation for nested fields.', 'wp-kernel-showcase' ),
				'type'        => 'string',
			),
			'q'          => array(
				'description' => __( 'Full-text search query.', 'wp-kernel-showcase' ),
				'type'        => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'department' => array(
				'description' => __( 'Department filter derived from taxonomy.', 'wp-kernel-showcase' ),
				'type'        => 'string',
			),
			'location'   => array(
				'description' => __( 'Location filter derived from taxonomy.', 'wp-kernel-showcase' ),
				'type'        => 'string',
			),
			'status'     => array(
				'description' => __( 'Filter jobs by publishing status.', 'wp-kernel-showcase' ),
				'type'        => 'string',
				'enum'        => array( 'draft', 'publish', 'closed' ),
			),
			'cursor'     => array(
				'description' => __( 'Cursor for pagination (1-indexed).', 'wp-kernel-showcase' ),
				'type'        => 'string',
			),
			'per_page'   => array(
				'description' => __( 'Number of items to return per page (max 50).', 'wp-kernel-showcase' ),
				'type'        => 'integer',
				'default'     => 10,
				'minimum'     => 1,
				'maximum'     => 50,
			),
		);
	}

	/**
	 * Get the job posting schema.
	 *
	 * @return array Item schema.
	 */
	public function get_item_schema(): array {
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
					'enum'        => array( 'draft', 'publish', 'closed' ),
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
			'required'   => array( 'title' ),
		);
	}

	/**
	 * Prepare a job post for response.
	 *
	 * @param WP_Post         $item    Job post object.
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function prepare_item_for_response( $item, $request ) {
		$data = $this->filter_response_by_fields(
			$this->prepare_item_data( $item ),
			$request
		);

		$response = rest_ensure_response( $data );

		return $response;
	}

	/**
	 * Build response data array for a job post.
	 *
	 * @param WP_Post $post Job post object.
	 * @return array<string, mixed>
	 */
	private function prepare_item_data( WP_Post $post ): array {
		$meta = array();

		foreach ( array_keys( $this->meta_fields ) as $key ) {
			$meta[ $key ] = get_post_meta( $post->ID, $key, true );
		}

		foreach ( $this->taxonomy_map as $param => $taxonomy ) {
			if ( empty( $meta[ $param ] ) ) {
				$term = $this->get_taxonomy_value( $post->ID, $taxonomy );
				if ( $term ) {
					$meta[ $param ] = $term;
				}
			}
		}

		return array(
			'id'             => (int) $post->ID,
			'title'          => get_the_title( $post ),
			'description'    => $post->post_content,
			'department'     => $meta['department'] ?: null,
			'location'       => $meta['location'] ?: null,
			'remote_policy'  => $meta['remote_policy'] ?: null,
			'job_type'       => $meta['job_type'] ?: null,
			'seniority'      => $meta['seniority'] ?: null,
			'salary_min'     => $meta['salary_min'] !== '' ? (int) $meta['salary_min'] : null,
			'salary_max'     => $meta['salary_max'] !== '' ? (int) $meta['salary_max'] : null,
			'currency'       => $meta['currency'] ?: 'USD',
			'apply_deadline' => $meta['apply_deadline'] ?: null,
			'status'         => $this->normalize_status_output( $post->post_status ),
			'created_at'     => $this->format_datetime( $post->post_date_gmt ?: $post->post_date ),
			'updated_at'     => $this->format_datetime( $post->post_modified_gmt ?: $post->post_modified ),
		);
	}

	/**
	 * Prepare data for insert/update.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @param int|null        $post_id Existing post ID when updating.
	 * @return array|WP_Error
	 */
	private function prepare_post_data( WP_REST_Request $request, ?int $post_id = null ) {
		$schema = $this->get_item_schema();

		$post_data = array(
			'post_type' => $this->post_type,
		);

		if ( null !== $post_id ) {
			$post_data['ID'] = $post_id;
		}

		$title = $request->get_param( 'title' );
		if ( null !== $title ) {
			$field_schema = $schema['properties']['title'] ?? null;

			if ( $field_schema ) {
				$check = rest_validate_value_from_schema( $title, $field_schema, 'title' );
				if ( is_wp_error( $check ) ) {
					return $check;
				}

				$sanitized_title = rest_sanitize_value_from_schema( $title, $field_schema );
				$post_data['post_title'] = sanitize_text_field( (string) $sanitized_title );
			} else {
				$post_data['post_title'] = sanitize_text_field( (string) $title );
			}
		} elseif ( null === $post_id ) {
			return $this->get_error(
				'invalid_title',
				__( 'The job title is required.', 'wp-kernel-showcase' ),
				400
			);
		}

		$description = $request->get_param( 'description' );
		if ( null !== $description ) {
			$field_schema = $schema['properties']['description'] ?? null;

			if ( $field_schema ) {
				$check = rest_validate_value_from_schema( $description, $field_schema, 'description' );
				if ( is_wp_error( $check ) ) {
					return $check;
				}

				$sanitized_description = rest_sanitize_value_from_schema( $description, $field_schema );
				$post_data['post_content'] = wp_kses_post( (string) $sanitized_description );
			} else {
				$post_data['post_content'] = wp_kses_post( (string) $description );
			}
		} elseif ( null === $post_id ) {
			$post_data['post_content'] = '';
		}

		$status_param = $request->get_param( 'status' );
		$status       = $this->normalize_status_input( $status_param, null === $post_id ? 'draft' : null );

		if ( null === $status && null !== $status_param ) {
			return $this->get_error(
				'invalid_status',
				__( 'Invalid job status.', 'wp-kernel-showcase' ),
				400
			);
		}

		if ( null !== $status ) {
			$post_data['post_status'] = $status;
		}

		$meta = array();
		foreach ( array_keys( $this->meta_fields ) as $key ) {
			if ( ! $request->offsetExists( $key ) ) {
				continue;
			}

			$value        = $request->get_param( $key );
			$field_schema = $schema['properties'][ $key ] ?? null;

			if ( $field_schema ) {
				$check = rest_validate_value_from_schema( $value, $field_schema, $key );
				if ( is_wp_error( $check ) ) {
					return $check;
				}

				$sanitized = rest_sanitize_value_from_schema( $value, $field_schema );
			} else {
				$sanitized = is_scalar( $value ) ? sanitize_text_field( (string) $value ) : null;
			}

			if ( null === $sanitized || '' === $sanitized ) {
				$meta[ $key ] = null;
			} else {
				$meta[ $key ] = $sanitized;
			}
		}

		if ( ! array_key_exists( 'currency', $meta ) && null === $post_id ) {
			$meta['currency'] = 'USD';
		}

		if ( ! array_key_exists( 'remote_policy', $meta ) && null === $post_id ) {
			$meta['remote_policy'] = 'office';
		}

		$tax_input = array();
		foreach ( $this->taxonomy_map as $param => $taxonomy ) {
			if ( ! $request->offsetExists( $param ) ) {
				continue;
			}

			$value = $request->get_param( $param );
			$value = is_scalar( $value ) ? sanitize_text_field( (string) $value ) : null;

			$tax_input[ $taxonomy ] = $value;

			if ( null !== $value && ! array_key_exists( $param, $meta ) ) {
				$meta[ $param ] = $value;
			}
		}

		return array( $post_data, $meta, $tax_input );
	}

	/**
	 * Update post meta values.
	 *
	 * @param int                  $post_id Post ID.
	 * @param array<string, mixed> $meta    Meta values.
	 */
	private function update_meta( int $post_id, array $meta ): void {
		foreach ( $meta as $key => $value ) {
			if ( null === $value || '' === $value ) {
				delete_post_meta( $post_id, $key );
				continue;
			}

			update_post_meta( $post_id, $key, $value );
		}
	}

	/**
	 * Synchronise taxonomy terms based on request input.
	 *
	 * @param int                  $post_id    Post ID.
	 * @param array<string, mixed> $taxonomies Taxonomy values keyed by taxonomy slug.
	 */
	private function sync_taxonomies( int $post_id, array $taxonomies ): void {
		foreach ( $this->taxonomy_map as $param => $taxonomy ) {
			if ( ! array_key_exists( $taxonomy, $taxonomies ) ) {
				continue;
			}

			$value = $taxonomies[ $taxonomy ];

			if ( null === $value || '' === $value ) {
				wp_set_object_terms( $post_id, array(), $taxonomy, false );
				continue;
			}

			wp_set_object_terms( $post_id, array( $value ), $taxonomy, false );
		}
	}

	/**
	 * Retrieve a job post by ID ensuring the post type matches.
	 *
	 * @param int $post_id Post ID.
	 * @return WP_Post|null
	 */
	private function get_job_post( int $post_id ): ?WP_Post {
		$post = get_post( $post_id );

		if ( ! $post || $post->post_type !== $this->post_type ) {
			return null;
		}

		return $post;
	}

	/**
	 * Resolve requested status values for WP_Query.
	 *
	 * @param mixed $value User supplied status.
	 * @return array
	 */
	private function resolve_statuses_for_query( $value ): array {
		if ( ! is_string( $value ) || '' === $value ) {
			return array_values( $this->status_map );
		}

		$normalized = $this->normalize_status_input( $value );

		if ( null === $normalized ) {
			return array_values( $this->status_map );
		}

		return array( $normalized );
	}

	/**
	 * Normalise an exposed status value to a stored post status.
	 *
	 * @param mixed       $value   Provided status value.
	 * @param string|null $default Default when no value provided.
	 * @return string|null
	 */
	private function normalize_status_input( $value, ?string $default = null ): ?string {
		if ( null === $value ) {
			return $default;
		}

		if ( ! is_string( $value ) ) {
			return $default;
		}

		$lower = strtolower( trim( $value ) );

		return $this->status_map[ $lower ] ?? $default;
	}

	/**
	 * Convert a stored post status to the exposed status value.
	 *
	 * @param string $status Stored post status.
	 * @return string
	 */
	private function normalize_status_output( string $status ): string {
		$lookup = array_flip( $this->status_map );

		return $lookup[ $status ] ?? 'draft';
	}

	/**
	 * Retrieve a taxonomy value as a string.
	 *
	 * @param int    $post_id  Post ID.
	 * @param string $taxonomy Taxonomy slug.
	 * @return string|null
	 */
	private function get_taxonomy_value( int $post_id, string $taxonomy ): ?string {
		$terms = wp_get_post_terms(
			$post_id,
			$taxonomy,
			array(
				'fields' => 'names',
			)
		);

		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return null;
		}

		return (string) $terms[0];
	}

	/**
	 * Format MySQL datetime for responses.
	 *
	 * @param string $datetime Datetime string.
	 * @return string|null
	 */
	private function format_datetime( string $datetime ): ?string {
		if ( '' === $datetime ) {
			return null;
		}

		return mysql2date( 'c', $datetime, false );
	}
}
