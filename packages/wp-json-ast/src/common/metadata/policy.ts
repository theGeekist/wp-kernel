import type {
	PolicyDefinition,
	PolicyFallback,
	PolicyMapWarning,
} from '../../policy/types';
import type { PolicyHelperMetadata } from '../../types';

export interface BuildPolicyHelperMetadataOptions {
	readonly sourcePath?: string;
	readonly definitions: readonly PolicyDefinition[];
	readonly fallback: PolicyFallback;
	readonly missing: readonly string[];
	readonly unused: readonly string[];
	readonly warnings: readonly PolicyMapWarning[];
}

export function buildPolicyHelperMetadata(
	options: BuildPolicyHelperMetadataOptions
): PolicyHelperMetadata {
	return {
		kind: 'policy-helper',
		map: {
			sourcePath: options.sourcePath,
			fallback: {
				capability: options.fallback.capability,
				appliesTo: options.fallback.appliesTo,
			},
			definitions: options.definitions.map((definition) => ({
				key: definition.key,
				capability: definition.capability,
				appliesTo: definition.appliesTo,
				binding: definition.binding,
				source: definition.source,
			})),
			missing: [...options.missing],
			unused: [...options.unused],
			warnings: options.warnings.map((warning) => ({
				code: warning.code,
				message: warning.message,
				context: cloneStructuredValue(warning.context),
			})),
		},
	} satisfies PolicyHelperMetadata;
}

function cloneStructuredValue<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) =>
			cloneStructuredValue(entry)
		) as unknown as T;
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.map(([key, entry]) => [key, cloneStructuredValue(entry)] as const)
			.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

		return Object.fromEntries(entries) as T;
	}

	return value;
}
