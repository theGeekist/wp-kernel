import { Command } from 'clipanion';
import { adoptCommandEnvironment, buildLegacyCommandLoader } from '../delegate';

describe('buildLegacyCommandLoader', () => {
	class TestCommand extends Command {
		override async execute(): Promise<number> {
			return 0;
		}
	}

	it('returns the provided command constructor without invoking loaders', async () => {
		const loadCommand = jest.fn();
		const defaultLoad = jest.fn();

		const load = buildLegacyCommandLoader({
			command: TestCommand,
			loadCommand,
			defaultLoad,
		});

		const result = await load();

		expect(result).toBe(TestCommand);
		expect(loadCommand).not.toHaveBeenCalled();
		expect(defaultLoad).not.toHaveBeenCalled();
	});

	it('invokes the loader once and caches the resolved constructor', async () => {
		const loadCommand = jest.fn(async () => TestCommand);

		const load = buildLegacyCommandLoader({
			command: undefined,
			loadCommand,
			defaultLoad: async () => TestCommand,
		});

		const first = load();
		const second = load();

		await Promise.all([first, second]);

		expect(loadCommand).toHaveBeenCalledTimes(1);

		await load();

		expect(loadCommand).toHaveBeenCalledTimes(1);
	});
});

describe('adoptCommandEnvironment', () => {
	it('copies cli context and streams between commands', () => {
		class SourceCommand extends Command {
			stdin?: unknown;
			stdout?: unknown;
			stderr?: unknown;

			override async execute(): Promise<number> {
				return 0;
			}
		}
		class TargetCommand extends Command {
			stdin?: unknown;
			stdout?: unknown;
			stderr?: unknown;

			override async execute(): Promise<number> {
				return 0;
			}
		}

		const source = Object.assign(new SourceCommand(), {
			cli: Symbol('cli'),
			context: { cwd: '/tmp' },
			path: ['doctor'],
			stdin: Symbol('stdin'),
			stdout: Symbol('stdout'),
			stderr: Symbol('stderr'),
		});
		const target = new TargetCommand();

		adoptCommandEnvironment(source, target);

		expect(target.cli).toBe(source.cli);
		expect(target.context).toBe(source.context);
		expect(target.path).toBe(source.path);
		expect(target.stdin).toBe(source.stdin);
		expect(target.stdout).toBe(source.stdout);
		expect(target.stderr).toBe(source.stderr);
	});
});
