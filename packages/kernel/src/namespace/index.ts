/**
 * Namespace Detection Module
 *
 * Provides intelligent auto-detection of plugin/product namespaces
 * for the WP Kernel framework.
 *
 * @package
 */

export {
	detectNamespace,
	getNamespace,
	isValidNamespace,
	sanitizeNamespace,
	resetNamespaceCache,
	type NamespaceDetectionOptions,
	type NamespaceDetectionResult,
	type NamespaceDetectionMode,
	type NamespaceRuntimeContext,
} from './detect.js';
