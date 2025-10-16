import { RuleTester } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';

export const DEFAULT_DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/mvp-cli-spec.md#6-blocks-of-authoring-safety';

export interface RuleTesterConfig {
	ecmaVersion?: number;
	sourceType?: 'script' | 'module';
}

export interface KernelConfigFixtureOptions {
	header?: string;
	footer?: string;
}

const FALLBACK_HEADER =
	'const normalizeKeyValue = (value: unknown) => value ?? null;\n';
const FALLBACK_FOOTER = `\nexport const kernelConfig = {\n        version: 1,\n        namespace: 'demo',\n        schemas: {},\n        resources: {\n                thing: resource,\n        },\n};\n`;

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
				ecmaVersion: config.ecmaVersion ?? 2022,
				sourceType: config.sourceType ?? 'module',
			},
		},
	});
}

export function buildKernelConfigFixture(
	body: string,
	options: KernelConfigFixtureOptions = {}
): string {
	const header = options.header ?? FALLBACK_HEADER;
	const footer = options.footer ?? FALLBACK_FOOTER;
	return `${header}${body}${footer}`;
}

export function buildDocComment(url: string = DEFAULT_DOC_URL): string {
	return `// For CLI config guidance see ${url}`;
}
