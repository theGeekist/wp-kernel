import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import {
	resolvePhpCodemodIngestionScriptPath,
	runPhpCodemodIngestion,
} from '../../driver/ingestionRunner';

jest.mock('node:child_process', () => ({
	spawn: jest.fn(),
}));

const spawnMock = jest.mocked(spawn);

class MockStream extends EventEmitter {
	public readonly setEncoding = jest.fn();
}

describe('ingestionRunner', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('runs the ingestion script and returns trimmed output lines', async () => {
		const stdout = new MockStream();
		const stderr = new MockStream();
		const closeHandlers: Array<(code: number | null) => void> = [];
		const errorHandlers: Array<(error: unknown) => void> = [];

		spawnMock.mockReturnValue({
			stdout,
			stderr,
			once: jest.fn(
				(event: string, handler: (...args: unknown[]) => void) => {
					if (event === 'close') {
						closeHandlers.push(
							handler as (code: number | null) => void
						);
					} else if (event === 'error') {
						errorHandlers.push(handler);
					}
				}
			),
		} as unknown as ReturnType<typeof spawn>);

		const runPromise = runPhpCodemodIngestion({
			workspaceRoot: '/workspace/project',
			files: ['/workspace/project/plugin.php'],
			phpBinary: '/usr/bin/php',
			scriptPath: '/pkg/php/ingest-program.php',
		});

		stdout.emit('data', ' {"file":"plugin.php"}\n');
		stdout.emit('data', '\n{"file":"loader.php"} ');
		stderr.emit('data', 'diagnostic');

		expect(errorHandlers).toHaveLength(1);
		closeHandlers.forEach((handler) => handler(0));

		const result = await runPromise;
		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe('diagnostic');
		expect(result.lines).toEqual([
			'{"file":"plugin.php"}',
			'{"file":"loader.php"}',
		]);

		expect(spawnMock).toHaveBeenCalledWith(
			'/usr/bin/php',
			[
				'/pkg/php/ingest-program.php',
				'/workspace/project',
				'/workspace/project/plugin.php',
			],
			expect.objectContaining({ cwd: '/workspace/project' })
		);
	});

	it('returns early when no files are provided', async () => {
		const result = await runPhpCodemodIngestion({
			workspaceRoot: '/workspace/project',
			files: [],
		});

		expect(result.lines).toHaveLength(0);
		expect(result.exitCode).toBe(0);
		expect(spawnMock).not.toHaveBeenCalled();
	});

	it('resolves script path from provided import meta URL', () => {
		const fakePath = new URL('file:///pkg/dist/index.js');
		const resolved = resolvePhpCodemodIngestionScriptPath({
			importMetaUrl: fakePath.href,
		});

		expect(resolved).toBe('/pkg/php/ingest-program.php');
	});
});
