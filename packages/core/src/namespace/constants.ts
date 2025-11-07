/**
 * Framework namespace constants
 *
 * Central definition of all framework namespace identifiers to prevent drift.
 * All framework code should import from here rather than hardcoding strings.
 *
 * @module @wpkernel/core/namespace/constants
 */

/**
 * Root framework namespace
 *
 * This is the canonical namespace for the WP Kernel framework.
 * Used as:
 * - Default reporter namespace when no plugin namespace detected
 * - Fallback in getNamespace() detection cascade
 * - Prefix for framework public APIs (events, hooks, storage)
 *
 */
export const WPK_NAMESPACE = 'wpk';

/**
 * Framework subsystem namespaces
 *
 * Granular namespaces for internal framework logging and debugging.
 * These provide better diagnostic context than the root namespace alone.
 */
export const WPK_SUBSYSTEM_NAMESPACES = {
	/** Capability subsystem */
	CAPABILITY: `${WPK_NAMESPACE}.capability`,
	/** Capability cache subsystem */
	CAPABILITY_CACHE: `${WPK_NAMESPACE}.capability.cache`,
	/** Resource cache subsystem */
	CACHE: `${WPK_NAMESPACE}.cache`,
	/** Action subsystem */
	ACTIONS: `${WPK_NAMESPACE}.actions`,
	/** Event bus subsystem */
	EVENTS: `${WPK_NAMESPACE}.events`,
	/** Namespace detection subsystem */
	NAMESPACE: `${WPK_NAMESPACE}.namespace`,
	/** Reporter subsystem */
	REPORTER: `${WPK_NAMESPACE}.reporter`,
} as const;

/**
 * Framework infrastructure constants
 *
 * Keys used for browser APIs (storage, channels), WordPress hooks, and public event names.
 */
export const WPK_INFRASTRUCTURE = {
	/** Storage key prefix for capability cache */
	CAPABILITY_CACHE_STORAGE: `${WPK_NAMESPACE}.capability.cache`,
	/** BroadcastChannel name for capability cache sync */
	CAPABILITY_CACHE_CHANNEL: `${WPK_NAMESPACE}.capability.cache`,
	/** BroadcastChannel name for capability events */
	CAPABILITY_EVENT_CHANNEL: `${WPK_NAMESPACE}.capability.events`,
	/** BroadcastChannel name for action lifecycle events */
	ACTIONS_CHANNEL: `${WPK_NAMESPACE}.actions`,
	/** WordPress hooks namespace prefix for WP Kernel events plugin */
	WP_HOOKS_NAMESPACE_PREFIX: `${WPK_NAMESPACE}/notices`,

	/** WordPress hooks namespace for UI DataViews bridge (default base) */
	WP_HOOKS_NAMESPACE_UI_DATAVIEWS: `${WPK_NAMESPACE}/ui/dataviews`,

	/** BroadcastChannel message type for action lifecycle events */
	ACTIONS_MESSAGE_TYPE_LIFECYCLE: `${WPK_NAMESPACE}.action.lifecycle`,
	/** BroadcastChannel message type for action custom events */
	ACTIONS_MESSAGE_TYPE_EVENT: `${WPK_NAMESPACE}.action.event`,
} as const;

/**
 * Public event names
 *
 * WordPress hook event names that are part of the public API.
 * External code (plugins, themes) can listen to these events.
 */
export const WPK_EVENTS = {
	/** Action lifecycle events */
	ACTION_START: `${WPK_NAMESPACE}.action.start`,
	ACTION_COMPLETE: `${WPK_NAMESPACE}.action.complete`,
	ACTION_ERROR: `${WPK_NAMESPACE}.action.error`,

	/** Resource transport events */
	RESOURCE_REQUEST: `${WPK_NAMESPACE}.resource.request`,
	RESOURCE_RESPONSE: `${WPK_NAMESPACE}.resource.response`,
	RESOURCE_ERROR: `${WPK_NAMESPACE}.resource.error`,

	/** Cache invalidation events */
	CACHE_INVALIDATED: `${WPK_NAMESPACE}.cache.invalidated`,
} as const;

/**
 * Type-safe subsystem namespace keys
 */
export type WPKSubsystemNamespace =
	(typeof WPK_SUBSYSTEM_NAMESPACES)[keyof typeof WPK_SUBSYSTEM_NAMESPACES];

/**
 * Type-safe infrastructure constant keys
 */
export type WPKInfrastructureConstant =
	(typeof WPK_INFRASTRUCTURE)[keyof typeof WPK_INFRASTRUCTURE];

/**
 * Type-safe public event name keys
 */
export type WPKEvent = (typeof WPK_EVENTS)[keyof typeof WPK_EVENTS];

/**
 * Configuration sources recognised by WP Kernel tooling.
 *
 * These filenames/keys are consumed by the CLI and runtime config loaders.
 */
export const WPK_CONFIG_SOURCES = {
	WPK_CONFIG_TS: 'wpk.config.ts',
	WPK_CONFIG_JS: 'wpk.config.js',
	PACKAGE_JSON_WPK: 'package.json#wpk',
} as const;

/**
 * Type-safe configuration source values.
 */
export type WPKConfigSource =
	(typeof WPK_CONFIG_SOURCES)[keyof typeof WPK_CONFIG_SOURCES];
