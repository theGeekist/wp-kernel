export type PhpNodeFinderQueryKey =
	| 'class.readonly-properties'
	| 'constructor.promoted-parameters'
	| 'enum.case-lookups';

export interface PhpNodeFinderQueryDefinition {
	readonly key: PhpNodeFinderQueryKey;
	readonly options?: Readonly<Record<string, unknown>>;
}

export interface PhpNodeFinderQueryConfiguration {
	readonly queries: ReadonlyArray<PhpNodeFinderQueryDefinition>;
}

export interface PhpNodeFinderQueryMatch {
	readonly summary: Readonly<Record<string, unknown>>;
	readonly attributes: Readonly<Record<string, unknown>>;
	readonly excerpt: unknown;
}

export interface PhpNodeFinderQueryResultEntry {
	readonly key: PhpNodeFinderQueryKey;
	readonly label: string;
	readonly description: string;
	readonly matches: ReadonlyArray<PhpNodeFinderQueryMatch>;
	readonly matchCount: number;
}

export interface PhpNodeFinderQueryResult {
	readonly file: string;
	readonly queries: ReadonlyArray<PhpNodeFinderQueryResultEntry>;
}

export function isPhpNodeFinderQueryConfigurationEmpty(
	configuration: PhpNodeFinderQueryConfiguration
): boolean {
	return configuration.queries.length === 0;
}

export function serialisePhpNodeFinderQueryConfiguration(
	configuration: PhpNodeFinderQueryConfiguration
): string {
	return `${JSON.stringify(configuration, null, 2)}\n`;
}
