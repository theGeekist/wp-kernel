import { Command } from 'clipanion';
import type { StartCommand as LegacyStartCommand } from '../../../commands/start';
import type { DoctorCommand as LegacyDoctorCommand } from '../../../commands/doctor';
import type { LegacyCommandConstructor } from '../internal/delegate';
import { makeWorkspaceMock } from '../../../../tests/workspace.test-support';
import type { FileManifest } from '../../workspace';

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
		it('injects workspace, reporter, and workflow dependencies', async () => {
			const workspace = makeWorkspaceMock();
			const reporter = { warn: jest.fn(), info: jest.fn() };
			const workflow = jest.fn().mockResolvedValue({
				manifest: { writes: [], deletes: [] } as FileManifest,
				summaryText: 'summary\n',
				summaries: [],
				dependencySource: 'fallback',
				namespace: 'demo',
				templateName: 'plugin',
			});
			const checkGit = jest.fn().mockResolvedValue(false);
			const buildWorkspaceMock = jest.fn().mockReturnValue(workspace);
			const buildReporterMock = jest.fn().mockReturnValue(reporter);

			const { buildInitCommand } = await import('../init');
			const NextInit = buildInitCommand({
				buildWorkspace: buildWorkspaceMock,
				buildReporter: buildReporterMock,
				runWorkflow: workflow,
				checkGitRepository: checkGit,
			});

			const command = new NextInit();
			command.cli = {} as never;
			command.context = buildCommandContext() as never;
			command.name = 'demo';

			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(buildWorkspaceMock).toHaveBeenCalledTimes(1);
			expect(buildReporterMock).toHaveBeenCalledTimes(1);
			expect(checkGit).toHaveBeenCalledWith(workspace.root);
			expect(workflow).toHaveBeenCalledWith(
				expect.objectContaining({
					workspace,
					projectName: 'demo',
				})
			);
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
