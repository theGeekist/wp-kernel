import { RuleTester } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';

type SupportedEcmaVersion =
	| 3
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13
	| 14
	| 15
	| 16
	| 17
	| 2015
	| 2016
	| 2017
	| 2018
	| 2019
	| 2020
	| 2021
	| 2022
	| 2023
	| 2024
	| 2025
	| 2026
	| 'latest';

export const DEFAULT_DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/docs/cli-migration-phases.md#authoring-safety-lint-rules';

export interface RuleTesterConfig {
	ecmaVersion?: SupportedEcmaVersion;
	sourceType?: 'script' | 'module';
}

export interface WPKernelConfigFixtureOptions {
	header?: string;
	footer?: string;
}

const FALLBACK_HEADER =
	'const normalizeKeyValue = (value: unknown) => value ?? null;\n';
const FALLBACK_FOOTER = `\nexport const wpkConfig = {\n        version: 1,\n        namespace: 'demo',\n        schemas: {},\n        resources: {\n                thing: resource,\n        },\n};\n`;

export function ensureStructuredClone() {
	if (typeof globalThis.structuredClone !== 'function') {
		globalThis.structuredClone = (value: unknown) =>
			JSON.parse(JSON.stringify(value));
	}
}

export function createRuleTester(config: RuleTesterConfig = {}): RuleTester {
	ensureStructuredClone();

	return new RuleTester({
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: config.ecmaVersion ?? 'latest',
				sourceType: config.sourceType ?? 'module',
			},
		},
	});
}

export function buildWPKernelConfigFixture(
	body: string,
	options: WPKernelConfigFixtureOptions = {}
): string {
	const header = options.header ?? FALLBACK_HEADER;
	const footer = options.footer ?? FALLBACK_FOOTER;
	return `${header}${body}${footer}`;
}

export function buildDocComment(url: string = DEFAULT_DOC_URL): string {
	return `// For CLI config guidance see ${url}`;
}
