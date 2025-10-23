import { EventEmitter } from 'node:events';
import type { WorkspaceLike } from '../workspace';
import {
	createPhpPrettyPrinter,
	resolvePrettyPrintScriptPath,
	type PhpProgram,
} from '../prettyPrinter/createPhpPrettyPrinter';

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
	readonly withStdin?: boolean;
}

function createMockChildProcess({
	onEnd,
	withStdin = true,
}: MockChildProcessOptions) {
	const child = new EventEmitter();
	const stdout = new EventEmitter() as EventEmitter & {
		setEncoding: jest.Mock;
	};
	const stderr = new EventEmitter() as EventEmitter & {
		setEncoding: jest.Mock;
	};
	stdout.setEncoding = jest.fn();
	stderr.setEncoding = jest.fn();

	let stdin: (EventEmitter & { end: jest.Mock }) | undefined;
	if (withStdin) {
		stdin = new EventEmitter() as EventEmitter & {
			end: jest.Mock;
		};
		stdin.end = jest.fn((..._args: unknown[]) => {
			onEnd({ child, stdout, stderr });
		});
	}

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
	const workspace: WorkspaceLike = {
		root: '/workspace',
		resolve: (...parts: string[]) => parts.join('/'),
		exists: async () => false,
	};
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

	it('resolves the default pretty print script path', () => {
		const scriptPath = resolvePrettyPrintScriptPath();
		expect(scriptPath.endsWith('php/pretty-print.php')).toBe(true);
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

		const prettyPrinter = createPhpPrettyPrinter({ workspace });
		process.env.PHP_MEMORY_LIMIT = '768M';

		const result = await prettyPrinter.prettyPrint({
			filePath: 'Rest/BaseController.php',
			program: [
				{
					nodeType: 'Stmt_Nop',
				},
			] as PhpProgram,
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
				expect.stringContaining('php/pretty-print.php'),
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

		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				program: [
					{
						nodeType: 'Stmt_Nop',
					},
				] as PhpProgram,
			})
		).rejects.toMatchObject({ code: 'DeveloperError' });
	});

	it('validates the AST payload shape', async () => {
		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				// @ts-expect-error testing runtime validation
				program: null,
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			data: expect.objectContaining({
				filePath: 'Rest/BaseController.php',
			}),
		});

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				program: [
					{
						nodeType: undefined,
					} as unknown as { nodeType: string },
				],
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			data: expect.objectContaining({
				invalidNodeIndex: 0,
			}),
		});

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				program: [null as unknown as { nodeType: string }],
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			data: expect.objectContaining({
				invalidNodeIndex: 0,
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

		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await prettyPrinter.prettyPrint({
			filePath: 'Rest/BaseController.php',
			program: [
				{
					nodeType: 'Stmt_Nop',
				},
			] as PhpProgram,
		});

		expect(spawnMock).toHaveBeenCalledWith(
			'php',
			[
				'-d',
				'memory_limit=512M',
				expect.stringContaining('php/pretty-print.php'),
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

		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				program: [
					{
						nodeType: 'Stmt_Nop',
					},
				] as PhpProgram,
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

		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				program: [
					{
						nodeType: 'Stmt_Nop',
					},
				] as PhpProgram,
			})
		).rejects.toMatchObject({ code: 'DeveloperError' });
	});

	it('propagates errors when the child process exposes no stdin writer', async () => {
		spawnMock.mockImplementation(() =>
			createMockChildProcess({
				withStdin: false,
				onEnd: ({ child }) => {
					setImmediate(() => {
						child.emit('close', 0);
					});
				},
			})
		);

		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				program: [
					{
						nodeType: 'Stmt_Nop',
					},
				] as PhpProgram,
			})
		).rejects.toMatchObject({
			code: 'DeveloperError',
			data: expect.objectContaining({
				scriptPath: expect.any(String),
			}),
		});
	});

	it('fails fast when the bridge omits the AST payload', async () => {
		spawnMock.mockImplementation(() =>
			createMockChildProcess({
				onEnd: ({ child, stdout }) => {
					setImmediate(() => {
						stdout.emit(
							'data',
							JSON.stringify({
								code: '<?php echo 1;\n',
							})
						);
						child.emit('close', 0);
					});
				},
			})
		);

		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				program: [
					{
						nodeType: 'Stmt_Nop',
					},
				] as PhpProgram,
			})
		).rejects.toMatchObject({ code: 'DeveloperError' });
	});

	it('bubbles up unexpected child process failures', async () => {
		spawnMock.mockImplementation(() =>
			createMockChildProcess({
				onEnd: ({ child }) => {
					setImmediate(() => {
						child.emit('error', new Error('bridge exploded'));
					});
				},
			})
		);

		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				program: [
					{
						nodeType: 'Stmt_Nop',
					},
				] as PhpProgram,
			})
		).rejects.toThrow('bridge exploded');
	});

	it('ignores duplicate bridge events once the promise settles', async () => {
		spawnMock.mockImplementation(() =>
			createMockChildProcess({
				onEnd: ({ child }) => {
					setImmediate(() => {
						child.emit('error', new Error('primary failure'));
						child.emit('close', 0);
						child.emit('error', new Error('secondary failure'));
					});
				},
			})
		);

		const prettyPrinter = createPhpPrettyPrinter({ workspace });

		await expect(
			prettyPrinter.prettyPrint({
				filePath: 'Rest/BaseController.php',
				program: [
					{
						nodeType: 'Stmt_Nop',
					},
				] as PhpProgram,
			})
		).rejects.toThrow('primary failure');
	});
});
