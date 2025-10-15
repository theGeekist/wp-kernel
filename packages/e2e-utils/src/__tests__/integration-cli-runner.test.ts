import { createCliRunner } from '../integration/cli-runner.js';

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
});
