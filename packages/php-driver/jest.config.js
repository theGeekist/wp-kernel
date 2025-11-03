import { createWPKJestConfig } from '@wpkernel/scripts/config/create-wpk-jest-config.js';

export default createWPKJestConfig({
	displayName: '@wpkernel/php-driver',
	packageDir: import.meta.url,
	collectCoverageFrom: [
		'<rootDir>/packages/php-driver/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/php-driver/src/**/__tests__/**',
		'!<rootDir>/packages/php-driver/src/**/*.d.ts',
		'!<rootDir>/packages/php-driver/src/index.ts',
	],
});
