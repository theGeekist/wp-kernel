import { createWPKJestConfig } from '../../scripts/config/create-wpk-jest-config.js';

const config = createWPKJestConfig({
	displayName: '@wpkernel/wp-json-ast',
	packageDir: import.meta.url,
	collectCoverageFrom: [
		'<rootDir>/packages/wp-json-ast/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/wp-json-ast/src/**/__tests__/**',
		'!<rootDir>/packages/wp-json-ast/src/**/*.d.ts',
		'!<rootDir>/packages/wp-json-ast/src/index.ts',
	],
});

export default config;
