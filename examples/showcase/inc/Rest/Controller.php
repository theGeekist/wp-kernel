<?php
/**
 * AUTO-GENERATED FILE. DO NOT EDIT BY HAND.
 *
 * Source: src/kernel.config.ts (via kernelConfig.resources.*)
 * Target: inc/Rest/Controller.php
 *
 * Provides common functionality for all REST controllers, including _fields parameter support.
 *
 * @package WPKernelShowcase
 */

namespace WPKernel\Showcase\Rest;

use WP_Error;
use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Base REST controller scaffolding.
 */
abstract class Controller extends WP_REST_Controller {
	/**
	 * Namespace for REST routes.
	 * Uses the plugin's text domain for proper namespace isolation.
	 *
	 * @var string
	 */
	protected $namespace = 'wp-kernel-showcase/v1';

	/**
	 * Filter response data based on _fields parameter.
	 *
	 * Supports dot notation for nested fields (e.g., 'author.name').
	 *
	 * @param array            $data    Response data to filter.
	 * @param WP_REST_Request  $request Request object.
	 * @return array Filtered data.
	 */
	protected function filter_response_by_fields( array $data, WP_REST_Request $request ): array {
		$fields = $request->get_param( '_fields' );

		if ( empty( $fields ) ) {
			return $data;
		}

		// Parse fields parameter (comma-separated list).
		$fields_array = array_map( 'trim', explode( ',', $fields ) );

		return $this->extract_fields( $data, $fields_array );
	}

	/**
	 * Extract specified fields from data structure.
	 *
	 * Supports nested fields with dot notation.
	 *
	 * @param array $data   Data to extract from.
	 * @param array $fields Fields to extract.
	 * @return array Extracted data.
	 */
	private function extract_fields( array $data, array $fields ): array {
		$result = array();

		foreach ( $fields as $field ) {
			// Handle nested fields (dot notation).
			if ( strpos( $field, '.' ) !== false ) {
				$parts = explode( '.', $field, 2 );
				$key   = $parts[0];
				$rest  = $parts[1];

				if ( isset( $data[ $key ] ) && is_array( $data[ $key ] ) ) {
					if ( ! isset( $result[ $key ] ) ) {
						$result[ $key ] = array();
					}
					$result[ $key ] = array_merge(
						$result[ $key ],
						$this->extract_fields( $data[ $key ], array( $rest ) )
					);
				}
			} elseif ( isset( $data[ $field ] ) ) {
				$result[ $field ] = $data[ $field ];
			}
		}

		return $result;
	}

	/**
	 * Get a consistent error response.
	 *
	 * @param string $code    Error code.
	 * @param string $message Error message.
	 * @param int    $status  HTTP status code.
	 * @param array  $data    Additional error data.
	 * @return WP_Error Error object.
	 */
	protected function get_error( string $code, string $message, int $status = 400, array $data = array() ): WP_Error {
		$error_data = array_merge(
			array( 'status' => $status ),
			$data
		);

		return new WP_Error( $code, $message, $error_data );
	}

	/**
	 * Check if request has valid permission.
	 *
	 * Override this method in child classes to implement capability checks.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return bool|WP_Error True if has permission, WP_Error otherwise.
	 */
	public function get_items_permissions_check( $request ) {
		return true;
	}

	/**
	 * Check if request has valid permission for single item.
	 *
	 * Override this method in child classes to implement capability checks.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return bool|WP_Error True if has permission, WP_Error otherwise.
	 */
	public function get_item_permissions_check( $request ) {
		return true;
	}

	/**
	 * Check if request has valid permission to create items.
	 *
	 * Override this method in child classes to implement capability checks.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return bool|WP_Error True if has permission, WP_Error otherwise.
	 */
	public function create_item_permissions_check( $request ) {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Check if request has valid permission to update items.
	 *
	 * Override this method in child classes to implement capability checks.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return bool|WP_Error True if has permission, WP_Error otherwise.
	 */
	public function update_item_permissions_check( $request ) {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Check if request has valid permission to delete items.
	 *
	 * Override this method in child classes to implement capability checks.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return bool|WP_Error True if has permission, WP_Error otherwise.
	 */
	public function delete_item_permissions_check( $request ) {
		return current_user_can( 'delete_posts' );
	}
}
