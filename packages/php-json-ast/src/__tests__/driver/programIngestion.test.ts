import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { createPhpProgramWriterHelper } from '../../programWriter';
import { consumePhpProgramIngestion } from '../../driver/programIngestion';
import {
	getPhpBuilderChannel,
	resetPhpBuilderChannel,
} from '../../builderChannel';
import type {
	PipelineContext,
	BuilderInput,
	BuilderOutput,
} from '../../programBuilder';
import { createReporterMock } from '@wpkernel/test-utils/shared/reporter';
import { createPhpDriverInstaller } from '@wpkernel/php-driver';

jest.setTimeout(120_000);

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..', '..');
const WORKSPACE_ROOT = PACKAGE_ROOT;
const OUTPUT_ROOT = path.join(PACKAGE_ROOT, '.test-artifacts', 'ingestion');
const FIXTURE_NAME = 'CodifiedController.php';
const FIXTURE_PATH = path.join(OUTPUT_ROOT, FIXTURE_NAME);
const CANONICAL_FIXTURE_PATH = path.join(
	PACKAGE_ROOT,
	'fixtures',
	'ingestion',
	FIXTURE_NAME
);
const CANONICAL_AST_PATH = path.join(
	PACKAGE_ROOT,
	'fixtures',
	'ingestion',
	'CodifiedController.ast.json'
);
const INGESTION_SCRIPT = path.join(PACKAGE_ROOT, 'php', 'ingest-program.php');
const VENDOR_DIRECTORY = path.join(PACKAGE_ROOT, 'vendor');

interface TestPipelineContext extends PipelineContext {
	readonly reporter: ReturnType<typeof createReporterMock>;
}

function createWorkspace(): PipelineContext['workspace'] {
	return {
		root: WORKSPACE_ROOT,
		resolve: (...parts: string[]) => path.resolve(WORKSPACE_ROOT, ...parts),
		cwd: () => WORKSPACE_ROOT,
		async write(file, contents, options = {}) {
			const target = path.isAbsolute(file)
				? file
				: path.resolve(WORKSPACE_ROOT, file);
			const directory = path.dirname(target);

			if (options.ensureDir !== false) {
				await fs.mkdir(directory, { recursive: true });
			}

			await fs.writeFile(target, contents, {
				mode: options.mode,
			});
		},
		async exists(target) {
			const resolved = path.isAbsolute(target)
				? target
				: path.resolve(WORKSPACE_ROOT, target);
			try {
				await fs.access(resolved);
				return true;
			} catch {
				return false;
			}
		},
	};
}

function createPipelineContext(): TestPipelineContext {
	const reporter = createReporterMock();
	return {
		workspace: createWorkspace(),
		phase: 'generate',
		reporter,
	};
}

async function ensureComposerDependencies(): Promise<void> {
	const installer = createPhpDriverInstaller();
	const reporter = createReporterMock();
	const workspace = createWorkspace();

	await installer.apply(
		{
			context: { workspace },
			input: undefined as never,
			output: undefined as never,
			reporter,
		},
		undefined
	);

	const autoloadPath = workspace.resolve('vendor', 'autoload.php');
	if (!(await workspace.exists(autoloadPath))) {
		throw new Error(
			'Composer dependencies were not installed for the PHP driver.'
		);
	}
}

function createBuilderInput(): BuilderInput {
	return {
		phase: 'generate',
		options: {},
		ir: null,
	};
}

function createBuilderOutput(): BuilderOutput {
	const actions: BuilderOutput['actions'] = [];
	return {
		actions,
		queueWrite: jest.fn((action) => {
			actions.push(action);
		}),
	};
}

async function ensureFixture(): Promise<void> {
	await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
	await fs.mkdir(OUTPUT_ROOT, { recursive: true });

	const source = await fs.readFile(CANONICAL_FIXTURE_PATH, 'utf8');
	await fs.writeFile(FIXTURE_PATH, source);
}

async function runIngestionScript(
	files: readonly string[]
): Promise<readonly string[]> {
	const child = spawn('php', [INGESTION_SCRIPT, WORKSPACE_ROOT, ...files], {
		cwd: WORKSPACE_ROOT,
	});

	const stdoutChunks: string[] = [];
	const stderrChunks: string[] = [];

	child.stdout.setEncoding('utf8');
	child.stderr.setEncoding('utf8');

	child.stdout.on('data', (chunk: string) => {
		stdoutChunks.push(chunk);
	});

	child.stderr.on('data', (chunk: string) => {
		stderrChunks.push(chunk);
	});

	const exitCode = await waitForExit(child);
	if (exitCode !== 0) {
		throw new Error(
			`Ingestion script exited with code ${exitCode}: ${stderrChunks.join('')}`
		);
	}

	return stdoutChunks
		.join('')
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function waitForExit(
	child: ChildProcessWithoutNullStreams
): Promise<number | null> {
	return new Promise((resolve, reject) => {
		child.once('error', (error) => reject(error));
		child.once('close', (code) => resolve(code));
	});
}

describe('consumePhpProgramIngestion', () => {
	beforeAll(async () => {
		await ensureComposerDependencies();
	});

	beforeEach(async () => {
		await ensureFixture();
	});

	afterAll(async () => {
		await fs.rm(VENDOR_DIRECTORY, { recursive: true, force: true });
	});

	afterEach(async () => {
		await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
	});

	it('queues ingested programs and forwards them to the writer helper', async () => {
		const context = createPipelineContext();
		const input = createBuilderInput();
		const output = createBuilderOutput();

		resetPhpBuilderChannel(context);

		const lines = await runIngestionScript([FIXTURE_PATH]);
		const messages = createAsyncIterable(lines);

		await consumePhpProgramIngestion({
			context,
			source: messages,
			defaultMetadata: { kind: 'index-file' },
		});

		const pending = getPhpBuilderChannel(context).pending();
		expect(pending).toHaveLength(1);

		const writer = createPhpProgramWriterHelper();
		try {
			await writer.apply(
				{
					context,
					input,
					output,
					reporter: context.reporter,
				},
				undefined
			);
		} catch (error) {
			const data =
				typeof error === 'object' && error !== null
					? (error as { data?: Record<string, unknown> }).data
					: undefined;
			const summary = Array.isArray(
				(data as { stderrSummary?: unknown }).stderrSummary
			)
				? (data as { stderrSummary: string[] }).stderrSummary
				: [];
			const stderr =
				typeof (data as { stderr?: unknown }).stderr === 'string'
					? (data as { stderr: string }).stderr
					: '';
			throw new Error(
				`Pretty printer failed: ${JSON.stringify(
					{ summary, stderr, data },
					null,
					2
				)}`
			);
		}

		const [message] = lines.map((line) => JSON.parse(line));
		const filePath = (message as { file: string }).file;

		const emittedPhp = await fs.readFile(filePath, 'utf8');
		const emittedAst = await fs.readFile(`${filePath}.ast.json`, 'utf8');

		const expectedAst = await fs.readFile(CANONICAL_AST_PATH, 'utf8');

		expect(emittedPhp).toContain('declare(strict_types=1);');
		expect(emittedPhp).toContain('final class CodifiedController');
		expect(emittedPhp).toContain("#[PropertyHook('resources')]");
		expect(emittedPhp).toContain('* Describe the controller lifecycle.');
		expect(emittedPhp).toContain(
			'public function __construct(public readonly string $name)'
		);

		const parsedExpectedAst = JSON.parse(expectedAst);
		expect(JSON.parse(emittedAst)).toEqual(parsedExpectedAst);
		expect(message.program).toEqual(parsedExpectedAst);

		expect(output.queueWrite).toHaveBeenCalledWith({
			file: filePath,
			contents: emittedPhp,
		});
		expect(output.queueWrite).toHaveBeenCalledWith({
			file: `${filePath}.ast.json`,
			contents: emittedAst,
		});
	});

	it('handles ingestion sources that yield pre-trimmed lines', async () => {
		const context = createPipelineContext();

		resetPhpBuilderChannel(context);

		const duplicateFixturePath = path.join(
			OUTPUT_ROOT,
			'CodifiedControllerCopy.php'
		);
		await fs.copyFile(FIXTURE_PATH, duplicateFixturePath);

		const lines = await runIngestionScript([
			FIXTURE_PATH,
			duplicateFixturePath,
		]);
		const messages = createAsyncIterable(lines);

		await consumePhpProgramIngestion({
			context,
			source: messages,
			defaultMetadata: { kind: 'index-file' },
		});

		const pending = getPhpBuilderChannel(context).pending();
		expect(pending).toHaveLength(lines.length);

		const expectedFiles = lines
			.map((line) => JSON.parse(line) as { file: string })
			.map((message) => message.file)
			.sort();

		const queuedFiles = pending.map((action) => action.file).sort();
		expect(queuedFiles).toEqual(expectedFiles);
	});
});

function createAsyncIterable<T>(values: readonly T[]): AsyncIterable<T> {
	return {
		async *[Symbol.asyncIterator]() {
			for (const value of values) {
				yield value;
			}
		},
	};
}
