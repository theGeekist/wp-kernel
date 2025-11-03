import { createWPKJestConfig } from '@wpkernel/scripts/config/create-wpk-jest-config.js';

export default createWPKJestConfig({
	displayName: '@wpkernel/core',
	packageDir: import.meta.url,
	collectCoverageFrom: [
		'<rootDir>/packages/core/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/core/src/**/__tests__/**',
		'!<rootDir>/packages/core/src/**/*.d.ts',
		'!<rootDir>/packages/core/src/index.ts',
		'!<rootDir>/packages/core/src/*/index.ts',
	],
	coverageThreshold: {
		global: {
			branches: 90,
			functions: 90,
			lines: 90,
			statements: 90,
		},
	},
});
