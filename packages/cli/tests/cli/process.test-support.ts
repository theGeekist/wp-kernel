import { EventEmitter } from 'node:events';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import type { InstallerDependencies } from '../../src/commands/init/installers';

export interface SpawnMockOptions {
	readonly close?: { code?: number; signal?: NodeJS.Signals | null };
	readonly error?: {
		message: string;
		exitCode?: number;
		signal?: NodeJS.Signals | null;
	};
}

export function createSpawnMock(options: SpawnMockOptions = {}): jest.Mock {
	return jest.fn<
		ChildProcess,
		[command: string, args: readonly string[], options: SpawnOptions]
	>(() => {
		const child = new EventEmitter();
		const shouldClose =
			options.close !== undefined || options.error === undefined;

		if (shouldClose) {
			process.nextTick(() => {
				const close = options.close ?? { code: 0, signal: null };
				child.emit('close', close.code ?? 0, close.signal ?? null);
			});
		}

		if (options.error) {
			process.nextTick(() => child.emit('error', options.error));
		}

		return child as unknown as ReturnType<
			NonNullable<InstallerDependencies['spawn']>
		>;
	});
}
