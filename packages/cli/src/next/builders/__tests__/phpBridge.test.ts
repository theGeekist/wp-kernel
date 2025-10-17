import { EventEmitter } from 'node:events';
import path from 'node:path';
import type { Workspace } from '../../workspace/types';

const spawnMock = jest.fn();

jest.mock('node:child_process', () => ({
	spawn: (...args: unknown[]) => spawnMock(...args),
}));

interface MockChildProcessOptions {
	readonly onEnd: (options: {
		readonly child: EventEmitter;
		readonly stdout: EventEmitter & { setEncoding: jest.Mock };
		readonly stderr: EventEmitter & { setEncoding: jest.Mock };
	}) => void;
}

function createMockChildProcess({ onEnd }: MockChildProcessOptions) {
	const child = new EventEmitter();
	const stdout = new EventEmitter() as EventEmitter & {
		setEncoding: jest.Mock;
	};
	const stderr = new EventEmitter() as EventEmitter & {
		setEncoding: jest.Mock;
	};
	const stdin = new EventEmitter() as EventEmitter & {
		end: jest.Mock;
	};

	stdout.setEncoding = jest.fn();
	stderr.setEncoding = jest.fn();
	stdin.end = jest.fn((..._args: unknown[]) => {
		onEnd({ child, stdout, stderr });
	});

	Object.assign(child, { stdout, stderr, stdin });

	return child as unknown as {
		stdout: typeof stdout;
		stderr: typeof stderr;
		stdin: typeof stdin;
		on: EventEmitter['on'];
		emit: EventEmitter['emit'];
	};
}

describe('createPhpPrettyPrinter', () => {
	const workspace = {
		root: path.join(process.cwd(), 'fixtures/workspace'),
	} as Workspace;
	const ORIGINAL_PHP_MEMORY_LIMIT = process.env.PHP_MEMORY_LIMIT;

	beforeEach(() => {
		spawnMock.mockReset();
		jest.resetModules();
		delete process.env.PHP_MEMORY_LIMIT;
	});

	afterEach(() => {
		if (ORIGINAL_PHP_MEMORY_LIMIT === undefined) {
			delete process.env.PHP_MEMORY_LIMIT;
		} else {
			process.env.PHP_MEMORY_LIMIT = ORIGINAL_PHP_MEMORY_LIMIT;
		}
	});

	it('invokes the PHP bridge and returns formatted code and AST payloads', async () => {
		spawnMock.mockImplementation(() =>
			createMockChildProcess({
				onEnd: ({ child, stdout }) => {
					setImmediate(() => {
						stdout.emit(
							'data',
							JSON.stringify({
								code: '<?php echo 1;\n',
								ast: ['node'],
							})
						);
						child.emit('close', 0);
					});
				},
			})
		);

		const { createPhpPrettyPrinter } = await import('../phpBridge');
		const prettyPrinter = createPhpPrettyPrinter({ workspace });
		process.env.PHP_MEMORY_LIMIT = '768M';

		const result = await prettyPrinter.prettyPrint({
			filePath: 'Rest/BaseController.php',
			code: '<?php echo 1;',
		});

		expect(result).toEqual({
			code: '<?php echo 1;\n',
			ast: ['node'],
		});

		expect(spawnMock).toHaveBeenCalledWith(
			'php',
			[
				'-d',
				'memory_limit=768M',
				expect.stringContaining(path.join('php', 'pretty-print.php')),
				workspace.root,
				'Rest/BaseController.php',
			],
			expect.objectContaining({
				cwd: workspace.root,
				env: expect.objectContaining({
					PHP_MEMORY_LIMIT: '768M',
				}),
			})
		);
	});

	it('raises a DeveloperError error when PHP binary or bridge is not available', async () => {
		spawnMock.mockImplementation(() =>
			createMockChildProcess({
				onEnd: ({ child }) => {
					setImmediate(() => {
						const error = new Error(
							'command not found'
						) as NodeJS.ErrnoException;
						error.code = 'ENOENT';
						child.emit('error', error);
					});
				},
			})
		);

		const { createPhpPrettyPrinter } = await import('../phpBridge');
		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				code: '<?php echo 1;',
			})
		).rejects.toMatchObject({ code: 'DeveloperError' });
	});

	it('validates that exactly one of code or AST payloads is provided', async () => {
		const { createPhpPrettyPrinter } = await import('../phpBridge');
		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				code: '<?php echo 1;',
				ast: [{ nodeType: 'Stmt_Echo', expr: [], attributes: {} }],
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			data: expect.objectContaining({
				hasCode: true,
				hasAst: true,
			}),
		});

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			data: expect.objectContaining({
				hasCode: false,
				hasAst: false,
			}),
		});

		expect(spawnMock).not.toHaveBeenCalled();
	});

	it('uses sane defaults for memory limit when unset', async () => {
		spawnMock.mockImplementation(() =>
			createMockChildProcess({
				onEnd: ({ child, stdout }) => {
					setImmediate(() => {
						stdout.emit(
							'data',
							JSON.stringify({
								code: '<?php echo 1;\n',
								ast: ['node'],
							})
						);
						child.emit('close', 0);
					});
				},
			})
		);

		const { createPhpPrettyPrinter } = await import('../phpBridge');
		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await prettyPrinter.prettyPrint({
			filePath: 'Rest/BaseController.php',
			code: '<?php echo 1;',
		});

		expect(spawnMock).toHaveBeenCalledWith(
			'php',
			[
				'-d',
				'memory_limit=512M',
				expect.stringContaining(path.join('php', 'pretty-print.php')),
				workspace.root,
				'Rest/BaseController.php',
			],
			expect.objectContaining({
				cwd: workspace.root,
				env: expect.objectContaining({
					PHP_MEMORY_LIMIT: '512M',
				}),
			})
		);
	});

	it('throws a KernelError when the bridge exits with a non-zero code', async () => {
		spawnMock.mockImplementation(() =>
			createMockChildProcess({
				onEnd: ({ child, stderr }) => {
					setImmediate(() => {
						stderr.emit('data', 'parse error');
						child.emit('close', 1);
					});
				},
			})
		);

		const { createPhpPrettyPrinter } = await import('../phpBridge');
		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				code: '<?php echo 1;',
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			data: expect.objectContaining({
				stderrSummary: ['parse error'],
			}),
		});
	});

	it('reports malformed responses from the PHP bridge', async () => {
		spawnMock.mockImplementation(() =>
			createMockChildProcess({
				onEnd: ({ child, stdout }) => {
					setImmediate(() => {
						stdout.emit(
							'data',
							JSON.stringify({
								code: null,
							})
						);
						child.emit('close', 0);
					});
				},
			})
		);

		const { createPhpPrettyPrinter } = await import('../phpBridge');
		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				code: '<?php echo 1;',
			})
		).rejects.toMatchObject({ code: 'DeveloperError' });
	});
});
