import { Command } from 'clipanion';
import {
	adoptCommandEnvironment,
	createLegacyCommandLoader,
} from '../delegate';

describe('createLegacyCommandLoader', () => {
	class TestCommand extends Command {
		override async execute(): Promise<number> {
			return 0;
		}
	}

	it('returns the provided command constructor without invoking loaders', async () => {
		const loadCommand = jest.fn();
		const defaultLoad = jest.fn();

		const load = createLegacyCommandLoader({
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

		const load = createLegacyCommandLoader({
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
		const source = Object.assign(new Command(), {
			cli: Symbol('cli'),
			context: { cwd: '/tmp' },
			path: ['doctor'],
			stdin: Symbol('stdin'),
			stdout: Symbol('stdout'),
			stderr: Symbol('stderr'),
		});
		const target = new Command();

		adoptCommandEnvironment(source, target);

		expect(target.cli).toBe(source.cli);
		expect(target.context).toBe(source.context);
		expect(target.path).toBe(source.path);
		expect(target.stdin).toBe(source.stdin);
		expect(target.stdout).toBe(source.stdout);
		expect(target.stderr).toBe(source.stderr);
	});
});
