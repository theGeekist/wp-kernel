import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { createPhpProgramWriterHelper } from '../../programWriter';
import { consumePhpProgramIngestion } from '../../driver/programIngestion';
import { createBaselineCodemodConfiguration } from '../../codemods/baselinePack';
import { serialisePhpCodemodConfiguration } from '../../driver/codemods';
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

jest.setTimeout(120_000);

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_WORKSPACE_ROOT = PACKAGE_ROOT;
const FIXTURE_NAME = 'CodifiedController.php';
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
const CODEMOD_FIXTURE_ROOT = path.join(PACKAGE_ROOT, 'fixtures', 'codemods');
const BASELINE_CODEMOD_EXPECTED_PHP = path.join(
	CODEMOD_FIXTURE_ROOT,
	'BaselinePack.after.php'
);
const BASELINE_CODEMOD_EXPECTED_AST = path.join(
	CODEMOD_FIXTURE_ROOT,
	'BaselinePack.after.ast.json'
);
const INGESTION_SCRIPT = path.join(PACKAGE_ROOT, 'php', 'ingest-program.php');

type CanonicalProgram = ReadonlyArray<Record<string, unknown>>;

interface TestPipelineContext extends PipelineContext {
	readonly reporter: ReturnType<typeof createReporterMock>;
}

type RoundTripResult = {
	readonly emittedPhp: string;
	readonly emittedAst: string;
	readonly filePath: string;
	readonly message: { readonly file: string; readonly program: unknown };
	readonly output: BuilderOutput;
	readonly lines: readonly string[];
};

let cleanupTargets: string[] = [];

interface CanonicalArtifacts {
	readonly php: string;
	readonly ast: string;
	readonly astJson: string;
	readonly program: CanonicalProgram;
}

async function readCanonicalArtifacts(): Promise<CanonicalArtifacts> {
	const [php, ast] = await Promise.all([
		fs.readFile(CANONICAL_FIXTURE_PATH, 'utf8'),
		fs.readFile(CANONICAL_AST_PATH, 'utf8'),
	]);

	const parsedAst = JSON.parse(ast) as unknown;

	if (!Array.isArray(parsedAst)) {
		throw new Error(
			'Canonical AST fixture should decode to an array of statements.'
		);
	}

	const program = parsedAst as CanonicalProgram;

	return {
		php,
		ast,
		astJson: `${JSON.stringify(program, null, 2)}\n`,
		program,
	};
}

function resolveOutputRoot(workspaceRoot: string): string {
	return path.join(workspaceRoot, '.test-artifacts', 'ingestion');
}

async function prepareWorkspaceRoot(workspaceRoot: string): Promise<void> {
	const outputRoot = resolveOutputRoot(workspaceRoot);
	await fs.rm(outputRoot, { recursive: true, force: true });
	await fs.mkdir(outputRoot, { recursive: true });
	registerCleanup(outputRoot);
}

function registerCleanup(target: string): void {
	if (!cleanupTargets.includes(target)) {
		cleanupTargets.push(target);
	}
}

async function ensureFixture(
	workspaceRoot: string,
	fileName: string = FIXTURE_NAME
): Promise<string> {
	const outputRoot = resolveOutputRoot(workspaceRoot);
	await fs.mkdir(outputRoot, { recursive: true });
	const target = path.join(outputRoot, fileName);
	const source = await fs.readFile(CANONICAL_FIXTURE_PATH, 'utf8');
	await fs.writeFile(target, source);
	return target;
}

async function ensureCodemodFixture(
	workspaceRoot: string,
	sourceFile: string,
	targetFile: string = path.basename(sourceFile)
): Promise<string> {
	const outputRoot = resolveOutputRoot(workspaceRoot);
	await fs.mkdir(outputRoot, { recursive: true });
	const target = path.join(outputRoot, targetFile);
	const sourcePath = path.join(CODEMOD_FIXTURE_ROOT, sourceFile);
	const contents = await fs.readFile(sourcePath, 'utf8');
	await fs.writeFile(target, contents);
	return target;
}

function createWorkspace(workspaceRoot: string): PipelineContext['workspace'] {
	return {
		root: workspaceRoot,
		resolve: (...parts: string[]) => path.resolve(workspaceRoot, ...parts),
		cwd: () => workspaceRoot,
		async write(file, contents, options = {}) {
			const target = path.isAbsolute(file)
				? file
				: path.resolve(workspaceRoot, file);
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
				: path.resolve(workspaceRoot, target);
			try {
				await fs.access(resolved);
				return true;
			} catch {
				return false;
			}
		},
	};
}

function createPipelineContext(
	workspaceRoot: string = DEFAULT_WORKSPACE_ROOT
): TestPipelineContext {
	const reporter = createReporterMock();
	return {
		workspace: createWorkspace(workspaceRoot),
		phase: 'generate',
		reporter,
	};
}

async function ensureComposerDependencies(): Promise<void> {
	const autoloadPath = path.join(PACKAGE_ROOT, 'vendor', 'autoload.php');
	try {
		await fs.access(autoloadPath);
	} catch {
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

async function runIngestionScript(
	files: readonly string[],
	workspaceRoot: string,
	configurationPath?: string
): Promise<readonly string[]> {
	const args = [INGESTION_SCRIPT, workspaceRoot];

	if (configurationPath !== undefined) {
		args.push('--config', configurationPath);
	}

	args.push(...files);

	const child = spawn('php', args, {
		cwd: workspaceRoot,
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

function formatPrettyPrinterError(error: unknown): Error {
	const data =
		typeof error === 'object' && error !== null
			? (error as { data?: Record<string, unknown> }).data
			: undefined;
	const summary = Array.isArray(
		(data as { stderrSummary?: unknown })?.stderrSummary
	)
		? ((data as { stderrSummary: string[] }).stderrSummary ?? [])
		: [];
	const stderr =
		typeof (data as { stderr?: unknown })?.stderr === 'string'
			? ((data as { stderr: string }).stderr ?? '')
			: '';

	return new Error(
		`Pretty printer failed: ${JSON.stringify({ summary, stderr, data }, null, 2)}`
	);
}

async function runRoundTrip(
	workspaceRoot: string,
	fixturePaths: readonly string[],
	configurationPath?: string
): Promise<RoundTripResult> {
	const context = createPipelineContext(workspaceRoot);
	const input = createBuilderInput();
	const output = createBuilderOutput();

	resetPhpBuilderChannel(context);

	const lines = await runIngestionScript(
		fixturePaths,
		workspaceRoot,
		configurationPath
	);
	const messages = createAsyncIterable(lines);

	await consumePhpProgramIngestion({
		context,
		source: messages,
		defaultMetadata: { kind: 'index-file' },
	});

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
		throw formatPrettyPrinterError(error);
	}

	const [message] = lines.map((line) => JSON.parse(line));
	const filePath = (message as { file: string }).file;
	const emittedPhp = await fs.readFile(filePath, 'utf8');
	const emittedAst = await fs.readFile(`${filePath}.ast.json`, 'utf8');

	return {
		emittedPhp,
		emittedAst,
		filePath,
		message: message as { file: string; program: unknown },
		output,
		lines,
	};
}

describe('consumePhpProgramIngestion', () => {
	beforeAll(async () => {
		await ensureComposerDependencies();
	});

	beforeEach(() => {
		cleanupTargets = [];
	});

	afterEach(async () => {
		await Promise.all(
			cleanupTargets.map((target) =>
				fs.rm(target, { recursive: true, force: true })
			)
		);
	});

	it('queues ingested programs and forwards them to the writer helper', async () => {
		const workspaceRoot = DEFAULT_WORKSPACE_ROOT;
		await prepareWorkspaceRoot(workspaceRoot);
		const fixturePath = await ensureFixture(workspaceRoot);

		const result = await runRoundTrip(workspaceRoot, [fixturePath]);
		const canonical = await readCanonicalArtifacts();
		const parsedResultAst = JSON.parse(result.emittedAst) as unknown;

		expect(result.emittedPhp).toBe(canonical.php);
		expect(result.emittedAst).toBe(canonical.astJson);
		expect(parsedResultAst).toEqual(canonical.program);
		expect(result.message.program).toEqual(canonical.program);

		expect(result.output.queueWrite).toHaveBeenCalledWith({
			file: result.filePath,
			contents: result.emittedPhp,
		});
		expect(result.output.queueWrite).toHaveBeenCalledWith({
			file: `${result.filePath}.ast.json`,
			contents: result.emittedAst,
		});
	});

	it('handles ingestion sources that yield pre-trimmed lines', async () => {
		const workspaceRoot = DEFAULT_WORKSPACE_ROOT;
		await prepareWorkspaceRoot(workspaceRoot);
		const primaryFixture = await ensureFixture(workspaceRoot);
		const duplicateFixture = await ensureFixture(
			workspaceRoot,
			'CodifiedControllerCopy.php'
		);

		const context = createPipelineContext(workspaceRoot);

		resetPhpBuilderChannel(context);

		const lines = await runIngestionScript(
			[primaryFixture, duplicateFixture],
			workspaceRoot
		);
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

	it('applies the baseline codemod pack before writing artefacts', async () => {
		const workspaceRoot = path.join(
			PACKAGE_ROOT,
			'.test-artifacts',
			'baseline-pack'
		);

		await fs.rm(workspaceRoot, { recursive: true, force: true });
		await fs.mkdir(workspaceRoot, { recursive: true });
		registerCleanup(workspaceRoot);

		await prepareWorkspaceRoot(workspaceRoot);
		const fixturePath = await ensureCodemodFixture(
			workspaceRoot,
			'BaselinePack.before.php'
		);

		const configuration = createBaselineCodemodConfiguration();
		const configurationPath = path.join(
			resolveOutputRoot(workspaceRoot),
			'baseline-pack.json'
		);
		await fs.writeFile(
			configurationPath,
			serialisePhpCodemodConfiguration(configuration)
		);

		const result = await runRoundTrip(
			workspaceRoot,
			[fixturePath],
			configurationPath
		);

		const [expectedPhp, expectedAst] = await Promise.all([
			fs.readFile(BASELINE_CODEMOD_EXPECTED_PHP, 'utf8'),
			fs.readFile(BASELINE_CODEMOD_EXPECTED_AST, 'utf8'),
		]);

		const parsedExpectedAst = JSON.parse(expectedAst) as unknown;
		const parsedResultAst = JSON.parse(result.emittedAst) as unknown;

		expect(result.emittedPhp).toBe(expectedPhp);
		expect(parsedResultAst).toEqual(parsedExpectedAst);
		expect(result.message.program).toEqual(parsedExpectedAst);

		expect(result.output.queueWrite).toHaveBeenCalledWith({
			file: result.filePath,
			contents: expectedPhp,
		});

		const astWriteCall = (
			result.output.queueWrite as jest.Mock
		).mock.calls.find(
			([call]) => call.file === `${result.filePath}.ast.json`
		);

		expect(astWriteCall).toBeDefined();

		const astContents = astWriteCall?.[0].contents;
		expect(typeof astContents).toBe('string');
		expect(JSON.parse(astContents as string)).toEqual(parsedExpectedAst);
	});

	it('falls back to the package autoload when workspace dependencies are absent', async () => {
		const workspaceRoot = path.join(
			PACKAGE_ROOT,
			'.test-artifacts',
			'workspace-no-vendor'
		);
		await fs.rm(workspaceRoot, { recursive: true, force: true });
		await fs.mkdir(workspaceRoot, { recursive: true });
		registerCleanup(workspaceRoot);

		await prepareWorkspaceRoot(workspaceRoot);
		const fixturePath = await ensureFixture(workspaceRoot);

		const autoloadPath = path.join(workspaceRoot, 'vendor', 'autoload.php');
		await expect(fs.access(autoloadPath)).rejects.toThrow();

		const result = await runRoundTrip(workspaceRoot, [fixturePath]);
		const canonical = await readCanonicalArtifacts();
		const parsedResultAst = JSON.parse(result.emittedAst) as unknown;

		expect(result.emittedPhp).toBe(canonical.php);
		expect(result.emittedAst).toBe(canonical.astJson);
		expect(parsedResultAst).toEqual(canonical.program);
		expect(result.message.program).toEqual(canonical.program);
		expect(result.filePath).toBe(fixturePath);

		expect(result.output.queueWrite).toHaveBeenCalledWith({
			file: result.filePath,
			contents: result.emittedPhp,
		});
		expect(result.output.queueWrite).toHaveBeenCalledWith({
			file: `${result.filePath}.ast.json`,
			contents: result.emittedAst,
		});
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
