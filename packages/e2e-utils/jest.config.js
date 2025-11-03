import { createWPKJestConfig } from '@wpkernel/scripts/config/create-wpk-jest-config.js';

export default createWPKJestConfig({
	displayName: '@wpkernel/e2e-utils',
	packageDir: import.meta.url,
	collectCoverageFrom: [
		'<rootDir>/packages/e2e-utils/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/e2e-utils/src/**/__tests__/**',
		'!<rootDir>/packages/e2e-utils/src/**/*.d.ts',
		'!<rootDir>/packages/e2e-utils/src/index.ts',
	],
});
