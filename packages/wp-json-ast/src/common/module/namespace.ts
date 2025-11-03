export interface ModuleNamespaceSegment {
	readonly name: string;
	readonly sanitized?: string | null;
}

export interface ModuleNamespaceConfig {
	readonly pluginNamespace: string;
	readonly sanitizedPluginNamespace?: string | null;
	readonly segments?: readonly ModuleNamespaceSegment[];
}

export interface ModuleNamespaceDerivation {
	readonly namespace: string;
	readonly sanitizedNamespace: string;
}

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
