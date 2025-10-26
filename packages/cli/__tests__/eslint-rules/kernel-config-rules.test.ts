import { RuleTester } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import configConsistencyRule from '../../../../eslint-rules/config-consistency.js';
import cacheKeysValidRule from '../../../../eslint-rules/cache-keys-valid.js';
import policyHintsRule from '../../../../eslint-rules/policy-hints.js';
import docLinksRule from '../../../../eslint-rules/doc-links.js';

const DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/docs/cli-migration-phases.md#authoring-safety-lint-rules';

if (typeof global.structuredClone !== 'function') {
	global.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}

const tester = new RuleTester({
	languageOptions: {
		parser: tsParser,
		parserOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
		},
	},
});

const filename = '/workspace/example/kernel.config.ts';

const baseConfigHeader = `const normalizeKeyValue = (value: unknown) => value ?? null;\n`;

const baseConfigFooter = `\nexport const kernelConfig = {\n        version: 1,\n        namespace: 'demo',\n        schemas: {},\n        resources: {\n                thing: resource,\n        },\n};\n`;

tester.run('config-consistency', configConsistencyRule, {
	valid: [
		{
			filename,
			code: `${baseConfigHeader}const resource = {\n        routes: {\n                get: { path: '/demo/v1/things/:id', method: 'GET' },\n                update: { path: '/demo/v1/things/:id', method: 'PUT', policy: 'things.update' },\n        },\n        identity: { type: 'number', param: 'id' },\n        storage: { mode: 'wp-post', postType: 'demo-thing' },\n};${baseConfigFooter}`,
		},
	],
	invalid: [
		{
			filename,
			code: `${baseConfigHeader}const resource = {\n        routes: {\n                get: { path: '/demo/v1/things/:slug', method: 'GET' },\n                remove: { path: '/demo/v1/things/:slug', method: 'DELETE' },\n        },\n        identity: { type: 'string', param: 'id' },\n        storage: { mode: 'wp-post' },\n};${baseConfigFooter}`,
			errors: [
				{ messageId: 'missingIdentityRoute' },
				{ messageId: 'missingPostType' },
			],
		},
		{
			filename,
			code: `${baseConfigHeader}const resource = {\n        routes: {\n                update: { path: '/demo/v1/things/:id', method: 'PUT', policy: 'things.update' },\n                patch: { path: '/demo/v1/things/:id', method: 'PUT', policy: 'things.patch' },\n        },\n};${baseConfigFooter}`,
			errors: [{ messageId: 'duplicateRoute' }],
		},
	],
});

tester.run('cache-keys-valid', cacheKeysValidRule, {
	valid: [
		{
			filename,
			code: `${baseConfigHeader}const resource = {\n        routes: { list: { path: '/demo/v1/things', method: 'GET' } },\n        cacheKeys: {\n                list: (params?: { search?: string }) => ['thing', params?.search ?? null],\n        },\n        queryParams: { search: { type: 'string' } },\n};${baseConfigFooter}`,
		},
		{
			filename,
			code: `${baseConfigHeader}const resource = {\n        routes: { get: { path: '/demo/v1/things/:id', method: 'GET' } },\n        cacheKeys: { get: (id?: string | number) => ['thing', 'get', id ?? null] },\n};${baseConfigFooter}`,
		},
	],
	invalid: [
		{
			filename,
			code: `${baseConfigHeader}const resource = {\n        routes: { list: { path: '/demo/v1/things', method: 'GET' } },\n        cacheKeys: { list: (params: { q?: string }) => { return 'thing'; } },\n        queryParams: { q: { type: 'string' } },\n};${baseConfigFooter}`,
			errors: [{ messageId: 'nonArrayReturn' }],
		},
		{
			filename,
			code: `${baseConfigHeader}const resource = {\n        routes: { list: { path: '/demo/v1/things', method: 'GET' } },\n        cacheKeys: { list: (params: { q?: string }) => ['thing', params, {}] },\n        queryParams: { q: { type: 'string' } },\n};${baseConfigFooter}`,
			errors: [{ messageId: 'nonPrimitiveElement' }],
		},
		{
			filename,
			code: `${baseConfigHeader}const resource = {\n        routes: { list: { path: '/demo/v1/things', method: 'GET' } },\n        cacheKeys: { list: (params: { q?: string }) => ['thing', params?.missing ?? null] },\n        queryParams: { q: { type: 'string' } },\n};${baseConfigFooter}`,
			errors: [{ messageId: 'unknownQueryParam' }],
		},
	],
});

tester.run('policy-hints', policyHintsRule, {
	valid: [
		{
			filename,
			code: `${baseConfigHeader}const resource = {\n        routes: {\n                create: { path: '/demo/v1/things', method: 'POST', policy: 'things.create' },\n        },\n};${baseConfigFooter}`,
		},
	],
	invalid: [
		{
			filename,
			code: `${baseConfigHeader}const resource = {\n        routes: {\n                create: { path: '/demo/v1/things', method: 'POST' },\n        },\n};${baseConfigFooter}`,
			errors: [{ messageId: 'missingPolicy' }],
		},
	],
});

tester.run('doc-links', docLinksRule, {
	valid: [
		{
			filename,
			code: `const resource = { routes: {} };\n// For CLI config guidance see ${DOC_URL}${baseConfigFooter}`,
		},
	],
	invalid: [
		{
			filename,
			code: `const resource = { routes: {} };${baseConfigFooter}`,
			errors: [
				{
					messageId: 'missingDocComment',
					suggestions: [
						{
							messageId: 'addDocComment',
							output: `const resource = { routes: {} };\n// For CLI config guidance see ${DOC_URL}${baseConfigFooter}`,
						},
					],
				},
			],
		},
	],
});
