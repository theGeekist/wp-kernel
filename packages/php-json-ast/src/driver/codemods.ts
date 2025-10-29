export interface PhpCodemodVisitorConfiguration<
	TOptions extends Record<string, unknown> = Record<string, unknown>,
> {
	readonly key: string;
	readonly options?: TOptions;
}

export interface PhpCodemodStackConfiguration {
	readonly key: string;
	readonly visitors: ReadonlyArray<PhpCodemodVisitorConfiguration>;
}

export interface PhpCodemodConfiguration {
	readonly stacks: ReadonlyArray<PhpCodemodStackConfiguration>;
}

export const DEFAULT_CODEMOD_STACK_KEY = 'ingest.before-print';

export function isPhpCodemodConfigurationEmpty(
	configuration: PhpCodemodConfiguration
): boolean {
	return (
		configuration.stacks.length === 0 ||
		configuration.stacks.every((stack) => stack.visitors.length === 0)
	);
}

export function serialisePhpCodemodConfiguration(
	configuration: PhpCodemodConfiguration
): string {
	return `${JSON.stringify(configuration, null, 2)}\n`;
}
