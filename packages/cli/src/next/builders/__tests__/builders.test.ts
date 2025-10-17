import path from 'node:path';
import { execFile } from 'node:child_process';
import { createBundler } from '../bundler';
import { createTsBuilder } from '../ts';
import { createPatcher } from '../patcher';
import { createPhpDriverInstaller } from '../phpDriver';
import type { BuildIrOptions, IRv1 } from '../../../ir/types';
import type { BuilderOutput } from '../../runtime/types';
import type { Workspace } from '../../workspace/types';

jest.mock('node:child_process', () => {
	const execFileMock = jest.fn(
		(
			_cmd: string,
			_args: readonly string[],
			_options: unknown,
			callback?: (
				error: Error | null,
				stdout: string,
				stderr: string
			) => void
		) => {
			callback?.(null, '', '');
		}
	);

	return { execFile: execFileMock };
});

const buildOptions: BuildIrOptions = {
	config: {
		version: 1,
		namespace: 'test',
		schemas: {},
		resources: {},
	},
	namespace: 'test',
	origin: 'typescript',
	sourcePath: '/workspace/kernel.config.ts',
};

const ir: IRv1 = {
	meta: {
		version: 1,
		namespace: 'test',
		origin: 'typescript',
		sourcePath: 'kernel.config.ts',
		sanitizedNamespace: 'test',
	},
	config: buildOptions.config,
	schemas: [],
	resources: [],
	policies: [],
	policyMap: {
		sourcePath: undefined,
		definitions: [],
		fallback: { capability: 'manage_options', appliesTo: 'resource' },
		missing: [],
		unused: [],
		warnings: [],
	},
	blocks: [],
	php: {
		namespace: 'Test',
		autoload: 'inc/',
		outputDir: '.generated/php',
	},
};

function createOutput(): BuilderOutput {
	const actions: BuilderOutput['actions'] = [];
	return {
		actions,
		queueWrite: (action) => {
			actions.push(action);
		},
	};
}

const existsMock = jest.fn(async () => true);

const workspace = {
	root: process.cwd(),
	resolve: (...parts: string[]) => path.join(process.cwd(), ...parts),
	exists: existsMock,
} as unknown as Workspace;

const stubHelpers = [
	createBundler(),
	createTsBuilder(),
	createPatcher(),
	createPhpDriverInstaller(),
];

describe('builder stubs', () => {
	const reporter = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};

	const context = {
		workspace,
		phase: 'generate' as const,
		reporter,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		existsMock.mockResolvedValue(true);
	});

	it('executes stub builders without errors', async () => {
		for (const helper of stubHelpers) {
			const output = createOutput();
			await helper.apply(
				{
					context,
					input: { phase: 'generate', options: buildOptions, ir },
					output,
					reporter,
				},
				undefined
			);
		}

		expect(reporter.debug).toHaveBeenCalledTimes(stubHelpers.length);
		expect(reporter.info).not.toHaveBeenCalled();
		expect(execFile).not.toHaveBeenCalled();
	});
});
