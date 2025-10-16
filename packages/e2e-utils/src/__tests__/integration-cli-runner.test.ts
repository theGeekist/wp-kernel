import type {
	CliCommand,
	CliCommandOptions,
	CliTranscript,
} from '../integration/types.js';
import { createCliRunner } from '../integration/cli-runner.js';

type FailureTranscript = Pick<
	CliTranscript,
	'exitCode' | 'stderr' | 'stdout' | 'command' | 'args' | 'env' | 'durationMs'
>;

interface FailureScenario {
	readonly name: string;
	readonly command: CliCommand;
	readonly options?: CliCommandOptions;
	readonly baseEnv?: NodeJS.ProcessEnv;
	readonly assert: (transcript: FailureTranscript) => void;
}

describe('createCliRunner', () => {
	it('captures stdout, stderr, and env metadata', async () => {
		const runner = createCliRunner({ CUSTOM_ENV: 'runner' });
		const transcript = await runner.run({
			command: process.execPath,
			args: [
				'-e',
				[
					"console.log('hello');",
					"console.error('world');",
					"process.stdout.write(process.env.CUSTOM_ENV ?? '');",
				].join('\n'),
			],
		});

		expect(transcript.exitCode).toBe(0);
		expect(transcript.stdout).toContain('hello');
		expect(transcript.stdout).toContain('runner');
		expect(transcript.stderr).toContain('world');
		expect(transcript.env.CUSTOM_ENV).toBe('runner');
	});

	it('respects stdin piping and timeouts', async () => {
		const runner = createCliRunner();
		const withInput = await runner.run(
			{
				command: process.execPath,
				args: [
					'-e',
					"process.stdin.on('data', (d) => process.stdout.write(d.toString().trim()));",
				],
			},
			{
				stdin: 'input-data',
			}
		);

		expect(withInput.stdout).toContain('input-data');
		expect(withInput.exitCode).toBe(0);

		const timed = await runner.run(
			{
				command: process.execPath,
				args: ['-e', 'setTimeout(() => {}, 200);'],
			},
			{
				timeoutMs: 50,
			}
		);

		expect(timed.exitCode).not.toBe(0);
	});

	it('merges environment overrides', async () => {
		const runner = createCliRunner({ BASE_ENV: 'base' });
		const transcript = await runner.run(
			{
				command: process.execPath,
				args: [
					'-e',
					'process.stdout.write(process.env.BASE_ENV + process.env.EXTRA_ENV);',
				],
			},
			{
				env: { EXTRA_ENV: 'extra' },
			}
		);

		expect(transcript.stdout).toBe('baseextra');
	});

	describe('failure diagnostics', () => {
		const scenarios: FailureScenario[] = [
			{
				name: 'non-zero exits surface stderr output',
				command: {
					command: process.execPath,
					args: [
						'-e',
						[
							"console.error('runner failure');",
							'process.exit(3);',
						].join('\n'),
					],
				},
				assert: (transcript) => {
					expect(transcript.exitCode).toBe(3);
					expect(transcript.stderr).toContain('runner failure');
					expect(transcript.command).toBe(process.execPath);
					expect(transcript.args).toEqual([
						'-e',
						[
							"console.error('runner failure');",
							'process.exit(3);',
						].join('\n'),
					]);
				},
			},
			{
				name: 'spawn errors attach failure summaries',
				command: {
					command: 'nonexistent-runner-command',
				},
				baseEnv: { RUNNER_ENV: 'base' },
				assert: (transcript) => {
					expect(transcript.exitCode).toBe(-1);
					expect(transcript.stderr).toContain(
						'Failed to spawn command "nonexistent-runner-command"'
					);
					expect(transcript.stderr).toMatch(/ENOENT/);
					expect(transcript.env.RUNNER_ENV).toBe('base');
				},
			},
			{
				name: 'timeouts interrupt hanging processes',
				command: {
					command: process.execPath,
					args: ['-e', 'setTimeout(() => {}, 200);'],
				},
				options: { timeoutMs: 50 },
				assert: (transcript) => {
					expect(transcript.exitCode).toBe(-1);
					expect(transcript.stderr).toBe('');
					expect(transcript.durationMs).toBeLessThan(200);
				},
			},
		];

		it.each(scenarios)('handles %s', async (scenario) => {
			const runner = createCliRunner(scenario.baseEnv);
			const transcript = await runner.run(
				scenario.command,
				scenario.options
			);

			scenario.assert(transcript);
		});
	});
});
