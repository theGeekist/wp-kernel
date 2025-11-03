import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import {
	serialisePhpNodeFinderQueryConfiguration,
	type PhpNodeFinderQueryResult,
	type PhpNodeFinderQueryResultEntry,
} from '../../queries/nodeFinder';

jest.setTimeout(60_000);

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPT_PATH = path.join(PACKAGE_ROOT, 'php', 'query-nodefinder.php');
const FIXTURE_PATH = path.join(
	PACKAGE_ROOT,
	'fixtures',
	'queries',
	'NodeFinderTargets.php'
);

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

async function writeQueryConfiguration(): Promise<string> {
	const configuration = serialisePhpNodeFinderQueryConfiguration({
		queries: [
			{ key: 'class.readonly-properties' },
			{ key: 'constructor.promoted-parameters' },
			{ key: 'enum.case-lookups' },
		],
	});

	const directory = await fs.mkdtemp(
		path.join(os.tmpdir(), 'php-json-ast-nodefinder-')
	);
	const filePath = path.join(directory, 'queries.json');
	await fs.writeFile(filePath, configuration);
	return filePath;
}

interface ProcessResult {
	readonly stdout: string;
	readonly stderr: string;
	readonly exitCode: number;
}

function runQueryProcess(args: readonly string[]): Promise<ProcessResult> {
	const child = spawn('php', args, {
		cwd: PACKAGE_ROOT,
	}) as ChildProcessWithoutNullStreams;

	return new Promise((resolve, reject) => {
		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});

		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		child.on('error', reject);
		child.on('close', (code) => {
			resolve({
				stdout,
				stderr,
				exitCode: code ?? 0,
			});
		});
	});
}

describe('query-nodefinder.php', () => {
	beforeAll(async () => {
		await ensureComposerDependencies();
	});

	it('emits structured results for the baseline query catalogue', async () => {
		const configurationPath = await writeQueryConfiguration();

		const { stdout, stderr, exitCode } = await runQueryProcess([
			SCRIPT_PATH,
			PACKAGE_ROOT,
			'--queries',
			configurationPath,
			FIXTURE_PATH,
		]);

		expect(exitCode).toBe(0);
		expect(stderr).toBe('');

		const lines = stdout
			.split(/\r?\n/u)
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		expect(lines).toHaveLength(1);

		const [firstLine] = lines;
		if (firstLine === undefined) {
			throw new Error('Expected query output from PHP process.');
		}

		const payload = JSON.parse(firstLine) as PhpNodeFinderQueryResult;
		expect(payload.file).toBe(FIXTURE_PATH);
		expect(payload.queries).toHaveLength(3);

		const readonlyQuery = payload.queries.find(
			(query: PhpNodeFinderQueryResultEntry) =>
				query.key === 'class.readonly-properties'
		);
		const promotedQuery = payload.queries.find(
			(query: PhpNodeFinderQueryResultEntry) =>
				query.key === 'constructor.promoted-parameters'
		);
		const enumQuery = payload.queries.find(
			(query: PhpNodeFinderQueryResultEntry) =>
				query.key === 'enum.case-lookups'
		);

		expect(readonlyQuery?.matchCount).toBe(3);
		expect(promotedQuery?.matchCount).toBe(4);
		expect(enumQuery?.matchCount).toBe(6);

		type QueryMatch = PhpNodeFinderQueryResultEntry['matches'][number];

		const propertyNames = readonlyQuery?.matches.map(
			(match: QueryMatch) => {
				return match.summary.propertyName as string;
			}
		);
		expect(propertyNames).toEqual(
			expect.arrayContaining(['title', 'slug', 'version'])
		);

		const parameterNames = promotedQuery?.matches.map(
			(match: QueryMatch) => {
				return match.summary.parameterName as string;
			}
		);
		expect(parameterNames).toEqual(
			expect.arrayContaining([
				'$name',
				'$count',
				'$createdAt',
				'$updatedAt',
			])
		);

		const enumCaseNames = enumQuery?.matches.map((match: QueryMatch) => {
			return `${match.summary.enumName as string}::${
				match.summary.caseName as string
			}`;
		});
		expect(enumCaseNames).toEqual(
			expect.arrayContaining([
				'DocumentStatus::Draft',
				'DocumentStatus::Published',
				'DocumentStatus::Archived',
			])
		);
	});
});
