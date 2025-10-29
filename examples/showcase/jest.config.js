import { createWPKJestConfig } from '@wpkernel/scripts/config/create-wpk-jest-config.js';

const config = createWPKJestConfig({
	displayName: 'wp-kernel-showcase',
	packageDir: import.meta.url,
	testMatch: [
		'<rootDir>/examples/showcase/**/__tests__/**/*.test.ts',
		'<rootDir>/examples/showcase/**/__tests__/**/*.test.tsx',
	],
});

config.testPathIgnorePatterns = [
	...(config.testPathIgnorePatterns ?? []),
	'/__tests__/e2e/',
	'/e2e/',
];

export default config;
