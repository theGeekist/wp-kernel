import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { Command, Option } from 'clipanion';
import { createReporter } from '@wpkernel/core/reporter';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPK_NAMESPACE } from '@wpkernel/core/namespace/constants';
import { runGenerate, type ExitCode } from './run-generate';
import { serialiseError } from './run-generate';
import { forwardProcessOutput } from './process-output';
import { ApplyCommand } from './apply';

export class BuildCommand extends Command {
	static override paths = [['build']];

	static override usage = Command.Usage({
		description:
			'Generate artifacts, run the Vite production build, and apply outputs.',
		examples: [
			['Run the full build pipeline', 'wpk build'],
			[
				'Skip apply and leave artifacts under .generated/',
				'wpk build --no-apply',
			],
		],
	});

	verbose = Option.Boolean('--verbose', false);
	noApply = Option.Boolean('--no-apply', false);

	override async execute(): Promise<ExitCode> {
		const reporter = createReporter({
			namespace: `${WPK_NAMESPACE}.cli.build`,
			level: this.verbose ? 'debug' : 'info',
			enabled: process.env.NODE_ENV !== 'test',
		});
		reporter.info('Starting build pipeline.', {
			apply: !this.noApply,
		});

		const generateReporter = reporter.child('generate');
		const generateResult = await runGenerate({
			verbose: this.verbose,
			reporter: generateReporter,
		});

		if (generateResult.output) {
			this.context.stdout.write(generateResult.output);
		}

		if (generateResult.exitCode !== 0) {
			reporter.error('Generation failed. Aborting build.', {
				exitCode: generateResult.exitCode,
			});
			return generateResult.exitCode;
		}

		const viteExitCode = await this.runViteBuild(reporter.child('vite'));
		if (viteExitCode !== 0) {
			reporter.error('Vite build failed.', { exitCode: viteExitCode });
			return viteExitCode;
		}

		if (this.noApply) {
			reporter.info('Skipping apply step as requested.', {
				reason: '--no-apply',
			});
			reporter.info('Build pipeline completed.', { applied: false });
			return 0;
		}

		const applyExitCode = await this.runApplyStep(reporter.child('apply'));
		if (applyExitCode !== 0) {
			reporter.error('Apply failed.', { exitCode: applyExitCode });
			return applyExitCode;
		}

		reporter.info('Build pipeline completed.', { applied: true });
		return 0;
	}

	protected createViteBuildProcess(): ChildProcessWithoutNullStreams {
		return spawn('pnpm', ['exec', 'vite', 'build'], {
			cwd: process.cwd(),
			env: {
				...process.env,
				NODE_ENV: 'production',
			},
			stdio: 'pipe',
		});
	}

	private async runViteBuild(reporter: Reporter): Promise<ExitCode> {
		reporter.info('Running Vite production build.');

		let child: ChildProcessWithoutNullStreams;
		try {
			child = this.createViteBuildProcess();
		} catch (error) {
			reporter.error('Failed to start Vite build.', {
				error: serialiseError(error),
			});
			return 1;
		}

		forwardProcessOutput({
			child,
			reporter,
			label: 'Vite build',
		});

		const exitCode = await new Promise<ExitCode>((resolve) => {
			let resolved = false;
			const resolveOnce = (code: ExitCode) => {
				if (!resolved) {
					resolved = true;
					resolve(code);
				}
			};

			child.once('error', (error) => {
				reporter.error('Vite build encountered an error.', {
					error: serialiseError(error),
				});
				resolveOnce(1 as ExitCode);
			});

			child.once('exit', (code, signal) => {
				const finalCode = (code ?? 1) as ExitCode;
				const payload = { exitCode: finalCode, signal };
				if (finalCode === 0) {
					reporter.info('Vite build completed.', payload);
				} else {
					reporter.warn('Vite build exited with errors.', payload);
				}
				resolveOnce(finalCode);
			});
		});

		return exitCode;
	}

	private async runApplyStep(reporter: Reporter): Promise<ExitCode> {
		reporter.info('Applying generated artifacts with --yes.');

		const applyCommand = new ApplyCommand();
		applyCommand.context = this.context;
		applyCommand.yes = true;
		applyCommand.backup = false;
		applyCommand.force = false;

		const exitCode = (await applyCommand.execute()) as ExitCode;

		if (exitCode === 0 && applyCommand.summary) {
			reporter.info('Apply completed.', {
				summary: applyCommand.summary,
				breakdown: {
					php: applyCommand.phpSummary,
					blocks: applyCommand.blockSummary,
				},
			});
		}

		return exitCode;
	}
}
