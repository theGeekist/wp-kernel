import path from 'path';
import { fileURLToPath } from 'url';
import baseConfig from '../../jest.config.base.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, '../..');

export default {
	...baseConfig,
	displayName: '@wpkernel/test-utils',
	rootDir: monorepoRoot,
	testMatch: [
		'<rootDir>/packages/test-utils/**/__tests__/**/*.ts',
		'<rootDir>/packages/test-utils/**/__tests__/**/*.tsx',
		'<rootDir>/packages/test-utils/**/__tests__/**/*.test.ts',
		'<rootDir>/packages/test-utils/**/__tests__/**/*.test.tsx',
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
	},
	setupFilesAfterEnv: ['<rootDir>/tests/setup-jest.ts'],
	collectCoverageFrom: [
		'<rootDir>/packages/test-utils/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/test-utils/src/**/__tests__/**',
		'!<rootDir>/packages/test-utils/src/**/*.d.ts',
		'!<rootDir>/packages/test-utils/src/index.ts',
	],
};
