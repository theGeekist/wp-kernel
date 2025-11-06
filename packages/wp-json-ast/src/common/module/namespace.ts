/**
 * Represents a segment of a module namespace.
 *
 * @category WordPress AST
 */
export interface ModuleNamespaceSegment {
	/** The name of the segment. */
	readonly name: string;
	/** An optional sanitized version of the segment name. */
	readonly sanitized?: string | null;
}

/**
 * Configuration for deriving a module namespace.
 *
 * @category WordPress AST
 */
export interface ModuleNamespaceConfig {
	/** The root namespace of the plugin. */
	readonly pluginNamespace: string;
	/** An optional sanitized version of the plugin namespace. */
	readonly sanitizedPluginNamespace?: string | null;
	/** Optional namespace segments to append to the root namespace. */
	readonly segments?: readonly ModuleNamespaceSegment[];
}

/**
 * Represents a derived module namespace.
 *
 * @category WordPress AST
 */
export interface ModuleNamespaceDerivation {
	/** The full, derived namespace. */
	readonly namespace: string;
	/** The sanitized version of the derived namespace. */
	readonly sanitizedNamespace: string;
}

/**
 * Derives a module namespace from a configuration.
 *
 * @param    config - The namespace configuration.
 * @returns The derived namespace.
 * @category WordPress AST
 */
export function deriveModuleNamespace(
	config: ModuleNamespaceConfig
): ModuleNamespaceDerivation {
	const namespaceSegments = buildNamespaceSegments(config);
	const sanitizedSegments = buildSanitizedSegments(config);

	return {
		namespace: joinNamespaceSegments(namespaceSegments),
		sanitizedNamespace: joinSanitizedSegments(sanitizedSegments),
	} satisfies ModuleNamespaceDerivation;
}

/**
 * Creates a module namespace segment.
 *
 * @param    name      - The name of the segment.
 * @param    sanitized - An optional sanitized version of the segment name.
 * @returns A module namespace segment.
 * @category WordPress AST
 */
export function moduleSegment(
	name: string,
	sanitized?: string | null
): ModuleNamespaceSegment {
	return { name, sanitized };
}

function buildNamespaceSegments(
	config: ModuleNamespaceConfig
): readonly string[] {
	const segments: string[] = [];
	if (isNonEmptyString(config.pluginNamespace)) {
		segments.push(config.pluginNamespace);
	}

	if (config.segments) {
		for (const segment of config.segments) {
			if (isNonEmptyString(segment.name)) {
				segments.push(segment.name);
			}
		}
	}

	return segments;
}

function buildSanitizedSegments(
	config: ModuleNamespaceConfig
): readonly string[] {
	const segments: string[] = [];
	const root = normaliseSanitizedSegment(
		config.sanitizedPluginNamespace ?? config.pluginNamespace
	);

	if (root) {
		segments.push(root);
	}

	if (!config.segments) {
		return segments;
	}

	for (const segment of config.segments) {
		const sanitized = normaliseSanitizedSegment(
			segment.sanitized ?? segment.name
		);

		if (sanitized.length === 0) {
			continue;
		}

		segments.push(sanitized);
	}

	return segments;
}

function joinNamespaceSegments(segments: readonly string[]): string {
	if (segments.length === 0) {
		return '';
	}

	return segments.join('\\');
}

function joinSanitizedSegments(segments: readonly string[]): string {
	if (segments.length === 0) {
		return '';
	}

	return segments.join('/');
}

function normaliseSanitizedSegment(value: string | null | undefined): string {
	if (!value) {
		return '';
	}

	return value
		.replace(/\+/g, '/')
		.split('/')
		.map((segment) => segment.trim())
		.filter(isNonEmptyString)
		.map(normaliseSanitizedToken)
		.filter((segment) => segment.length > 0)
		.join('-');
}

function normaliseSanitizedToken(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}
