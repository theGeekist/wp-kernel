import { createWPKJestConfig } from '@wpkernel/scripts/config/create-wpk-jest-config.js';

export default createWPKJestConfig({
	displayName: '@wpkernel/test-utils',
	packageDir: import.meta.url,
	collectCoverageFrom: [
		'<rootDir>/packages/test-utils/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/test-utils/src/**/__tests__/**',
		'!<rootDir>/packages/test-utils/src/**/*.d.ts',
		'!<rootDir>/packages/test-utils/src/index.ts',
	],
});
