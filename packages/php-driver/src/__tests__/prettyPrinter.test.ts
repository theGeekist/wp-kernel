import { EventEmitter } from 'node:events';
import { KernelError } from '@wpkernel/core/error';
import { createPhpPrettyPrinter } from '../prettyPrinter';
import type { DriverWorkspace, PhpPrettyPrintPayload } from '../types';

jest.mock('node:child_process', () => ({
	spawn: jest.fn(),
}));

import { spawn } from 'node:child_process';

const spawnMock = jest.mocked(spawn);

function createWorkspace(): DriverWorkspace {
	return {
		root: '/workspace',
		resolve: (...parts: string[]) => parts.join('/'),
		exists: async () => true,
	};
}

function createPayload(program: unknown): PhpPrettyPrintPayload {
	return {
		filePath: '/workspace/example.php',
		program: program as never,
	};
}

function createMockedChildProcess({
	exitCode = 0,
	stdout = '',
	stderr = '',
} = {}) {
	const child = new EventEmitter();
	const stdoutStream = new EventEmitter() as EventEmitter & {
		setEncoding: jest.Mock;
	};
	stdoutStream.setEncoding = jest.fn();

	const stderrStream = new EventEmitter() as EventEmitter & {
		setEncoding: jest.Mock;
	};
	stderrStream.setEncoding = jest.fn();

	const stdin = new EventEmitter() as EventEmitter & {
		setEncoding: jest.Mock;
		end: jest.Mock;
	};
	stdin.setEncoding = jest.fn();
	stdin.end = jest.fn(() => {
		stdoutStream.emit('data', stdout);
		stderrStream.emit('data', stderr);
		child.emit('close', exitCode);
	});

	return Object.assign(child, {
		stdout: stdoutStream,
		stderr: stderrStream,
		stdin,
	});
}

describe('createPhpPrettyPrinter', () => {
	beforeEach(() => {
		spawnMock.mockReset();
	});

	it('validates the AST payload before spawning', async () => {
		const printer = createPhpPrettyPrinter({
			workspace: createWorkspace(),
		});

		await expect(printer.prettyPrint(createPayload(null))).rejects.toEqual(
			expect.any(KernelError)
		);
	});

	it('throws when AST nodes are missing nodeType', async () => {
		const printer = createPhpPrettyPrinter({
			workspace: createWorkspace(),
		});

		await expect(
			printer.prettyPrint(createPayload([{}]))
		).rejects.toBeInstanceOf(KernelError);
	});

	it('propagates non-zero exit codes as KernelError', async () => {
		spawnMock.mockReturnValue(
			createMockedChildProcess({
				exitCode: 1,
				stdout: '',
				stderr: 'boom',
			})
		);

		const printer = createPhpPrettyPrinter({
			workspace: createWorkspace(),
		});

		await expect(
			printer.prettyPrint(createPayload([{ nodeType: 'Stmt_Nop' }]))
		).rejects.toBeInstanceOf(KernelError);
	});

	it('parses successful bridge output', async () => {
		const result = {
			code: '<?php echo 1;\n',
			ast: [{ nodeType: 'Stmt_Nop' }],
		};
		spawnMock.mockReturnValue(
			createMockedChildProcess({
				exitCode: 0,
				stdout: `${JSON.stringify(result)}\n`,
				stderr: '',
			})
		);

		const printer = createPhpPrettyPrinter({
			workspace: createWorkspace(),
		});
		const output = await printer.prettyPrint(
			createPayload([{ nodeType: 'Stmt_Nop' }])
		);

		expect(output).toEqual(result);
	});
});
