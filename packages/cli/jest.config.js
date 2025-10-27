import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWPKJestConfig } from '../../scripts/config/create-wpk-jest-config.js';

const config = createWPKJestConfig({
	displayName: '@wpkernel/cli',
	packageDir: import.meta.url,
	collectCoverageFrom: [
		'<rootDir>/packages/cli/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/cli/src/**/__tests__/**',
		'!<rootDir>/packages/cli/src/**/__test-support__/**',
		'!<rootDir>/packages/cli/src/**/*.test-support.ts',
		'!<rootDir>/packages/cli/src/ir/__fixtures__/**',
		'!<rootDir>/packages/cli/src/index.ts',
		'!<rootDir>/packages/cli/src/version.ts',
		'!<rootDir>/packages/cli/src/cli/**',
		'!<rootDir>/packages/cli/src/commands/**',
		'!<rootDir>/packages/cli/src/internal/**',
		'!<rootDir>/packages/cli/src/printers/**',
		'!<rootDir>/packages/cli/src/printers/php/**',
		'!<rootDir>/packages/cli/src/ir/index.ts',
	],
	coverageThreshold: {
		global: {
			branches: 85,
			functions: 90,
			lines: 90,
			statements: 90,
		},
	},
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config.globalSetup = path.resolve(__dirname, 'tests/jest-global-setup.js');
config.coveragePathIgnorePatterns = [
	...(config.coveragePathIgnorePatterns ?? []),
	'<rootDir>/packages/cli/src/ir/__fixtures__',
];

export default config;
