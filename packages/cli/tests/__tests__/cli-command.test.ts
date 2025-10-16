describe('cli-command test support', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	it('creates distinct stdout and stderr streams', async () => {
		const { createCommandContext, assignCommandContext } = await import(
			'@wpkernel/test-utils/cli'
		);

		const first = createCommandContext();
		const second = createCommandContext();

		expect(first.stdout).not.toBe(second.stdout);
		expect(first.stderr).not.toBe(second.stderr);

		class FakeCommand {
			context!: unknown;
		}

		const command = new FakeCommand();
		const result = assignCommandContext(command);

		expect(result.context).toBe(command.context);
	});

	it('honours provided cwd and color depth overrides', async () => {
		const { createCommandContext } = await import(
			'@wpkernel/test-utils/cli'
		);
		const customCwd = '/custom';

		const harness = createCommandContext({ cwd: customCwd, colorDepth: 8 });

		expect(harness.context.cwd()).toBe(customCwd);
		expect(harness.context.colorDepth).toBe(8);
	});
});
