import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { Command, Option } from 'clipanion';
import { createReporter } from '@wpkernel/core/reporter';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import { runGenerate, type ExitCode } from './run-generate';
import { serialiseError } from './run-generate';
import { forwardProcessOutput } from './process-output';
import { ApplyCommand } from './apply';
import { EXIT_CODES } from './run-generate/types';

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

		if (generateResult.exitCode !== EXIT_CODES.SUCCESS) {
			reporter.error('Generation failed. Aborting build.', {
				exitCode: generateResult.exitCode,
			});
			return generateResult.exitCode;
		}

		const viteExitCode = await this.runViteBuild(reporter.child('vite'));
		if (viteExitCode !== EXIT_CODES.SUCCESS) {
			reporter.error('Vite build failed.', { exitCode: viteExitCode });
			return viteExitCode;
		}

		if (this.noApply) {
			reporter.info('Skipping apply step as requested.', {
				reason: '--no-apply',
			});
			reporter.info('Build pipeline completed.', { applied: false });
			return EXIT_CODES.SUCCESS;
		}

		const applyExitCode = await this.runApplyStep(reporter.child('apply'));
		if (applyExitCode !== EXIT_CODES.SUCCESS) {
			reporter.error('Apply failed.', { exitCode: applyExitCode });
			return applyExitCode;
		}

		reporter.info('Build pipeline completed.', { applied: true });
		return EXIT_CODES.SUCCESS;
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
			return EXIT_CODES.UNEXPECTED_ERROR;
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
				resolveOnce(EXIT_CODES.UNEXPECTED_ERROR as ExitCode);
			});

			child.once('exit', (code, signal) => {
				const finalCode = (code ??
					EXIT_CODES.UNEXPECTED_ERROR) as ExitCode;
				const payload = { exitCode: finalCode, signal };
				if (finalCode === EXIT_CODES.SUCCESS) {
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

		if (exitCode === EXIT_CODES.SUCCESS && applyCommand.summary) {
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
