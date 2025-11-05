import type {
	ResourceCapabilityMap,
	ResourceIdentityConfig,
	ResourceQueryParams,
	ResourceStorageConfig,
	ResourceUIConfig,
} from '@wpkernel/core/resource';
import type { WPKernelConfigV1 } from '../config/types';

/**
 * Defines the provenance of a schema, indicating how it was generated or provided.
 *
 * @category IR
 */
export type SchemaProvenance = 'manual' | 'auto';

/**
 * Represents an Intermediate Representation (IR) for a schema.
 *
 * @category IR
 */
export interface IRSchema {
	/** A unique key for the schema. */
	key: string;
	/** The source path of the schema definition. */
	sourcePath: string;
	/** A hash of the schema content for change detection. */
	hash: string;
	/** The actual schema definition. */
	schema: unknown;
	/** The provenance of the schema (manual or auto-generated). */
	provenance: SchemaProvenance;
	/** Optional: Information about what the schema was generated from. */
	generatedFrom?: {
		type: 'storage';
		resource: string;
	};
}

/**
 * Defines the transport type for an IR route.
 *
 * @category IR
 */
export type IRRouteTransport = 'local' | 'remote';

/**
 * Represents an Intermediate Representation (IR) for a resource route.
 *
 * @category IR
 */
export interface IRRoute {
	/** The HTTP method of the route (e.g., 'GET', 'POST'). */
	method: string;
	/** The URL path of the route. */
	path: string;
	/** Optional: The capability required to access this route. */
	capability?: string;
	/** A hash of the route definition for change detection. */
	hash: string;
	/** The transport mechanism for the route (local or remote). */
	transport: IRRouteTransport;
}

/**
 * Represents an Intermediate Representation (IR) for a resource cache key.
 *
 * @category IR
 */
export interface IRResourceCacheKey {
	/** The segments that make up the cache key. */
	segments: readonly unknown[];
	/** The source of the cache key definition (default or config). */
	source: 'default' | 'config';
}

/**
 * Represents a warning generated during IR processing.
 *
 * @category IR
 */
export interface IRWarning {
	/** A unique code for the warning. */
	code: string;
	/** A human-readable warning message. */
	message: string;
	/** Optional: Additional context for the warning. */
	context?: Record<string, unknown>;
}

/**
 * Defines the severity level of an IR diagnostic message.
 *
 * @category IR
 */
export type IRDiagnosticSeverity = 'info' | 'warn' | 'error';

/**
 * Represents an Intermediate Representation (IR) for a diagnostic message.
 *
 * @category IR
 */
export interface IRDiagnostic {
	/** A unique key for the diagnostic. */
	key: string;
	/** The diagnostic message. */
	message: string;
	/** The severity of the diagnostic. */
	severity: IRDiagnosticSeverity;
	/** Optional: Additional context for the diagnostic. */
	context?: Record<string, unknown>;
}

/**
 * Represents an Intermediate Representation (IR) for a resource.
 *
 * @category IR
 */
export interface IRResource {
	/** The name of the resource. */
	name: string;
	/** The key of the schema associated with this resource. */
	schemaKey: string;
	/** The provenance of the schema. */
	schemaProvenance: SchemaProvenance;
	/** An array of routes defined for this resource. */
	routes: IRRoute[];
	/** Cache key definitions for various resource operations. */
	cacheKeys: {
		list: IRResourceCacheKey;
		get: IRResourceCacheKey;
		create?: IRResourceCacheKey;
		update?: IRResourceCacheKey;
		remove?: IRResourceCacheKey;
	};
	/** Optional: Identity configuration for the resource. */
	identity?: ResourceIdentityConfig;
	/** Optional: Storage configuration for the resource. */
	storage?: ResourceStorageConfig;
	/** Optional: Query parameters configuration for the resource. */
	queryParams?: ResourceQueryParams;
	/** Optional: UI configuration for the resource. */
	ui?: ResourceUIConfig;
	/** Optional: Inline capability mappings for the resource. */
	capabilities?: ResourceCapabilityMap;
	/** A hash of the resource definition for change detection. */
	hash: string;
	/** An array of warnings associated with this resource. */
	warnings: IRWarning[];
}

/**
 * Represents an Intermediate Representation (IR) for a capability hint.
 *
 * @category IR
 */
export interface IRCapabilityHint {
	/** The key of the capability. */
	key: string;
	/** The source of the capability hint (resource or config). */
	source: 'resource' | 'config';
	/** References to where this capability is used. */
	references: Array<{
		resource: string;
		route: string;
		transport: IRRouteTransport;
	}>;
}

/**
 * Defines the scope of a capability.
 *
 * @category IR
 */
export type IRCapabilityScope = 'resource' | 'object';

/**
 * Represents an Intermediate Representation (IR) for a capability definition.
 *
 * @category IR
 */
export interface IRCapabilityDefinition {
	/** The key of the capability. */
	key: string;
	/** The underlying capability string. */
	capability: string;
	/** The scope to which the capability applies. */
	appliesTo: IRCapabilityScope;
	/** Optional: The binding parameter for object-level capabilities. */
	binding?: string;
	/** The source of the capability definition (map or fallback). */
	source: 'map' | 'fallback';
}

/**
 * Represents an Intermediate Representation (IR) for a capability map.
 *
 * @category IR
 */
export interface IRCapabilityMap {
	/** Optional: The source path of the capability map definition. */
	sourcePath?: string;
	/** An array of capability definitions. */
	definitions: IRCapabilityDefinition[];
	/** Fallback capability definition. */
	fallback: {
		capability: string;
		appliesTo: IRCapabilityScope;
	};
	/** An array of missing capabilities. */
	missing: string[];
	/** An array of unused capabilities. */
	unused: string[];
	/** An array of warnings related to the capability map. */
	warnings: IRWarning[];
}

/**
 * Represents an Intermediate Representation (IR) for a block.
 *
 * @category IR
 */
export interface IRBlock {
	/** A unique key for the block. */
	key: string;
	/** The directory where the block is defined. */
	directory: string;
	/** Indicates if the block has a render function. */
	hasRender: boolean;
	/** The source path of the block's manifest. */
	manifestSource: string;
}

/**
 * Represents an Intermediate Representation (IR) for a PHP project.
 *
 * @category IR
 */
export interface IRPhpProject {
	/** The PHP namespace of the project. */ namespace: string;
	/** The autoload path for the PHP project. */ autoload: string;
	/** The output directory for generated PHP files. */ outputDir: string;
}

/**
 * The top-level Intermediate Representation (IR) for version 1.
 *
 * This interface encapsulates all the processed metadata and configurations
 * of a WP Kernel project, providing a structured representation that can be
 * used by code generators and other tools.
 *
 * @category IR
 */
export interface IRv1 {
	/** Metadata about the IR, including version, namespace, and source information. */
	meta: {
		version: 1;
		namespace: string;
		sourcePath: string;
		origin: string;
		sanitizedNamespace: string;
	};
	/** The original WP Kernel configuration. */
	config: WPKernelConfigV1;
	/** An array of schema IRs. */
	schemas: IRSchema[];
	/** An array of resource IRs. */ resources: IRResource[];
	/** An array of capability hints. */ capabilities: IRCapabilityHint[];
	/** The capability map IR. */ capabilityMap: IRCapabilityMap;
	/** An array of block IRs. */ blocks: IRBlock[];
	/** The PHP project IR. */ php: IRPhpProject;
	/** Optional: An array of diagnostic messages. */ diagnostics?: IRDiagnostic[];
}

/**
 * Options for building the Intermediate Representation (IR).
 *
 * @category IR
 */
export interface BuildIrOptions {
	/** The WP Kernel configuration. */
	config: WPKernelConfigV1;
	/** The source path of the configuration file. */
	sourcePath: string;
	/** The origin of the configuration. */
	origin: string;
	/** The namespace of the project. */
	namespace: string;
}
