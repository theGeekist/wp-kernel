import { createWPKJestConfig } from '../../scripts/config/create-wpk-jest-config.js';

const config = createWPKJestConfig({
	displayName: '@wpkernel/php-json-ast',
	packageDir: import.meta.url,
	collectCoverageFrom: [
		'<rootDir>/packages/php-json-ast/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/php-json-ast/src/**/__tests__/**',
		'!<rootDir>/packages/php-json-ast/src/**/*.d.ts',
		'!<rootDir>/packages/php-json-ast/src/index.ts',
	],
});

config.testPathIgnorePatterns = [
	...(config.testPathIgnorePatterns ?? []),
	'testUtils\\.test-support\\.(js|ts|tsx)$',
];

export default config;
