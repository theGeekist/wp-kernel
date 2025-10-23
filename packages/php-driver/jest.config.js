import path from 'path';
import { fileURLToPath } from 'url';
import baseConfig from '../../jest.config.base.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, '../..');

export default {
	...baseConfig,
	displayName: '@wpkernel/php-driver',
	rootDir: monorepoRoot,
	testMatch: [
		'<rootDir>/packages/php-driver/**/__tests__/**/*.ts',
		'<rootDir>/packages/php-driver/**/__tests__/**/*.tsx',
		'<rootDir>/packages/php-driver/**/__tests__/**/*.test.ts',
		'<rootDir>/packages/php-driver/**/__tests__/**/*.test.tsx',
	],
	moduleNameMapper: {
		...baseConfig.moduleNameMapper,
		'^@test-utils/(.*)\\.js$': '<rootDir>/tests/test-utils/$1',
		'^@test-utils/(.*)$': '<rootDir>/tests/test-utils/$1',
		'^@wpkernel/core$': '<rootDir>/packages/core/src',
		'^@wpkernel/core/(.*)$': '<rootDir>/packages/core/src/$1',
		'^@wpkernel/ui$': '<rootDir>/packages/ui/src',
		'^@wpkernel/ui/(.*)$': '<rootDir>/packages/ui/src/$1',
		'^@wpkernel/cli$': '<rootDir>/packages/cli/src',
		'^@wpkernel/cli/(.*)$': '<rootDir>/packages/cli/src/$1',
		'^@wpkernel/e2e-utils$': '<rootDir>/packages/e2e-utils/src',
		'^@wpkernel/e2e-utils/(.*)$': '<rootDir>/packages/e2e-utils/src/$1',
		'^@wpkernel/test-utils$': '<rootDir>/packages/test-utils/src',
		'^@wpkernel/test-utils/(.*)$': '<rootDir>/packages/test-utils/src/$1',
		'^@wpkernel/php-json-ast$': '<rootDir>/packages/php-json-ast/src',
		'^@wpkernel/php-json-ast/(.*)$':
			'<rootDir>/packages/php-json-ast/src/$1',
		'^@wpkernel/php-driver$': '<rootDir>/packages/php-driver/src',
		'^@wpkernel/php-driver/(.*)$': '<rootDir>/packages/php-driver/src/$1',
	},
	setupFilesAfterEnv: ['<rootDir>/tests/setup-jest.ts'],
	collectCoverageFrom: [
		'<rootDir>/packages/php-driver/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/php-driver/src/**/__tests__/**',
		'!<rootDir>/packages/php-driver/src/**/*.d.ts',
		'!<rootDir>/packages/php-driver/src/index.ts',
	],
};
