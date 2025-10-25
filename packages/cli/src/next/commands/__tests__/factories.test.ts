import { Command } from 'clipanion';
import type { InitCommand as LegacyInitCommand } from '../../../commands/init';
import type { GenerateCommand as LegacyGenerateCommand } from '../../../commands/generate';
import type { StartCommand as LegacyStartCommand } from '../../../commands/start';
import type { DoctorCommand as LegacyDoctorCommand } from '../../../commands/doctor';
import type { LegacyCommandConstructor } from '../internal/delegate';

function buildCommandContext() {
	return {
		stdout: { write: jest.fn() },
		stderr: { write: jest.fn() },
	} as const;
}

describe('command factories', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	describe('buildInitCommand', () => {
		it('lazily loads the legacy command and forwards options', async () => {
			const captured: unknown[] = [];

			class LegacyInit extends Command {
				static override paths: string[][] = [['init']];
				static override usage = Command.Usage({
					description: 'legacy init',
				});

				name?: string;
				template?: string;
				force = false;
				verbose = false;
				preferRegistryVersions = false;

				override async execute(): Promise<number> {
					captured.push({
						context: this.context,
						name: this.name,
						template: this.template,
						force: this.force,
						verbose: this.verbose,
						preferRegistryVersions: this.preferRegistryVersions,
					});
					return 7;
				}
			}

			const legacyConstructor =
				LegacyInit as unknown as LegacyCommandConstructor<LegacyInitCommand>;
			const loader: jest.MockedFunction<
				() => Promise<LegacyCommandConstructor<LegacyInitCommand>>
			> = jest.fn().mockResolvedValue(legacyConstructor);
			const { buildInitCommand } = await import('../init');
			const NextInit = buildInitCommand({ loadCommand: loader });

			expect(loader).not.toHaveBeenCalled();

			const command = new NextInit();
			command.cli = {} as never;
			command.context = buildCommandContext() as never;
			command.name = 'demo';
			command.template = 'plugin';
			command.force = true;
			command.verbose = true;
			command.preferRegistryVersions = true;

			const result = await command.execute();

			expect(result).toBe(7);
			expect(loader).toHaveBeenCalledTimes(1);
			expect(captured).toEqual([
				{
					context: command.context,
					name: 'demo',
					template: 'plugin',
					force: true,
					verbose: true,
					preferRegistryVersions: true,
				},
			]);
		});

		it('supports pre-resolved commands without invoking the loader', async () => {
			class LegacyInit extends Command {
				static override paths: string[][] = [['init']];
				static override usage = Command.Usage({
					description: 'legacy init',
				});

				override async execute(): Promise<void> {
					return undefined;
				}
			}

			const legacyConstructor =
				LegacyInit as unknown as LegacyCommandConstructor<LegacyInitCommand>;
			const loader: jest.MockedFunction<
				() => Promise<LegacyCommandConstructor<LegacyInitCommand>>
			> = jest.fn().mockRejectedValue(new Error('should not load'));
			const { buildInitCommand } = await import('../init');
			const NextInit = buildInitCommand({
				command: legacyConstructor,
				loadCommand: loader,
			});

			const command = new NextInit();
			command.cli = {} as never;
			command.context = buildCommandContext() as never;

			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(loader).not.toHaveBeenCalled();
		});
	});

	describe('buildGenerateCommand', () => {
		it('copies CLI context and exposes summary from the legacy command', async () => {
			const summary = { applied: 1 };
			class LegacyGenerate extends Command {
				static override paths: string[][] = [['generate']];
				static override usage = Command.Usage({
					description: 'legacy generate',
				});

				dryRun = false;
				verbose = false;
				summary?: typeof summary;

				override async execute(): Promise<number> {
					this.summary = summary;
					return 0;
				}
			}

			const legacyConstructor =
				LegacyGenerate as unknown as LegacyCommandConstructor<LegacyGenerateCommand>;
			const loader: jest.MockedFunction<
				() => Promise<LegacyCommandConstructor<LegacyGenerateCommand>>
			> = jest.fn().mockResolvedValue(legacyConstructor);
			const { buildGenerateCommand } = await import('../generate');
			const NextGenerate = buildGenerateCommand({
				loadCommand: loader,
			});

			const command = new NextGenerate();
			command.cli = {} as never;
			command.context = buildCommandContext() as never;
			command.dryRun = true;
			command.verbose = true;

			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(loader).toHaveBeenCalledTimes(1);
			expect(command.summary).toBe(summary);
		});

		it('normalises non-numeric return values to zero', async () => {
			class LegacyGenerate extends Command {
				static override paths: string[][] = [['generate']];
				static override usage = Command.Usage({
					description: 'legacy generate',
				});

				dryRun = false;
				verbose = false;

				override async execute(): Promise<void> {
					return undefined;
				}
			}

			const legacyConstructor =
				LegacyGenerate as unknown as LegacyCommandConstructor<LegacyGenerateCommand>;
			const loader: jest.MockedFunction<
				() => Promise<LegacyCommandConstructor<LegacyGenerateCommand>>
			> = jest.fn().mockResolvedValue(legacyConstructor);
			const { buildGenerateCommand } = await import('../generate');
			const NextGenerate = buildGenerateCommand({
				loadCommand: loader,
			});

			const command = new NextGenerate();
			command.cli = {} as never;
			command.context = buildCommandContext() as never;

			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(command.summary).toBeUndefined();
		});
	});

	describe('buildStartCommand', () => {
		it('forwards start options to the legacy command', async () => {
			const captured: Array<{ verbose: boolean; auto: boolean }> = [];

			class LegacyStart extends Command {
				static override paths: string[][] = [['start']];
				static override usage = Command.Usage({
					description: 'legacy start',
				});

				verbose = false;
				autoApplyPhp = false;

				override async execute(): Promise<number> {
					captured.push({
						verbose: this.verbose,
						auto: this.autoApplyPhp,
					});
					return 0;
				}
			}

			const legacyConstructor =
				LegacyStart as unknown as LegacyCommandConstructor<LegacyStartCommand>;
			const loader: jest.MockedFunction<
				() => Promise<LegacyCommandConstructor<LegacyStartCommand>>
			> = jest.fn().mockResolvedValue(legacyConstructor);
			const { buildStartCommand } = await import('../start');
			const NextStart = buildStartCommand({ loadCommand: loader });

			const command = new NextStart();
			command.cli = {} as never;
			command.context = buildCommandContext() as never;
			command.verbose = true;
			command.autoApplyPhp = true;

			await command.execute();

			expect(loader).toHaveBeenCalledTimes(1);
			expect(captured).toEqual([{ verbose: true, auto: true }]);
		});

		it('caches the legacy constructor across executions', async () => {
			let executions = 0;

			class LegacyStart extends Command {
				static override paths: string[][] = [['start']];
				static override usage = Command.Usage({
					description: 'legacy start',
				});

				override async execute(): Promise<void> {
					executions += 1;
				}
			}

			const legacyConstructor =
				LegacyStart as unknown as LegacyCommandConstructor<LegacyStartCommand>;
			const loader: jest.MockedFunction<
				() => Promise<LegacyCommandConstructor<LegacyStartCommand>>
			> = jest.fn().mockResolvedValue(legacyConstructor);
			const { buildStartCommand } = await import('../start');
			const NextStart = buildStartCommand({ loadCommand: loader });

			const first = new NextStart();
			first.cli = {} as never;
			first.context = buildCommandContext() as never;

			const second = new NextStart();
			second.cli = {} as never;
			second.context = buildCommandContext() as never;

			await first.execute();
			await second.execute();

			expect(loader).toHaveBeenCalledTimes(1);
			expect(executions).toBe(2);
		});
	});

	describe('buildDoctorCommand', () => {
		it('delegates execution to the legacy doctor command', async () => {
			const execute = jest.fn().mockResolvedValue(undefined);

			class LegacyDoctor extends Command {
				static override paths: string[][] = [['doctor']];
				static override usage = Command.Usage({
					description: 'legacy doctor',
				});

				override async execute(): Promise<void> {
					await execute();
				}
			}

			const legacyConstructor =
				LegacyDoctor as unknown as LegacyCommandConstructor<LegacyDoctorCommand>;
			const loader: jest.MockedFunction<
				() => Promise<LegacyCommandConstructor<LegacyDoctorCommand>>
			> = jest.fn().mockResolvedValue(legacyConstructor);
			const { buildDoctorCommand } = await import('../doctor');
			const NextDoctor = buildDoctorCommand({
				loadCommand: loader,
			});

			const command = new NextDoctor();
			command.cli = {} as never;
			command.context = buildCommandContext() as never;

			await command.execute();

			expect(loader).toHaveBeenCalledTimes(1);
			expect(execute).toHaveBeenCalledTimes(1);
		});

		it('supports pre-resolved commands without invoking the loader', async () => {
			class LegacyDoctor extends Command {
				static override paths: string[][] = [['doctor']];
				static override usage = Command.Usage({
					description: 'legacy doctor',
				});

				override async execute(): Promise<void> {
					return undefined;
				}
			}

			const legacyConstructor =
				LegacyDoctor as unknown as LegacyCommandConstructor<LegacyDoctorCommand>;
			const loader: jest.MockedFunction<
				() => Promise<LegacyCommandConstructor<LegacyDoctorCommand>>
			> = jest.fn().mockRejectedValue(new Error('should not load'));
			const { buildDoctorCommand } = await import('../doctor');
			const NextDoctor = buildDoctorCommand({
				command: legacyConstructor,
				loadCommand: loader,
			});

			const command = new NextDoctor();
			command.cli = {} as never;
			command.context = buildCommandContext() as never;

			await expect(command.execute()).resolves.toBeUndefined();
			expect(loader).not.toHaveBeenCalled();
		});
	});
});
