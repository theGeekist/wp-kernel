import { Command } from 'clipanion';

function createStubCommand(name: string) {
	class Stub extends Command {
		static override paths = [[name]] as const;
	}

	return Stub;
}

describe('next index exports', () => {
	it('re-exports builder factories and helpers', async () => {
		jest.resetModules();

		const { unstable_mockModule: unstableMockModule } =
			jest as typeof jest & {
				unstable_mockModule: (
					moduleName: string,
					factory: () => Record<string, unknown>
				) => Promise<void>;
			};

		await unstableMockModule('../commands/init', () => ({
			createInitCommand: () => createStubCommand('init'),
		}));
		await unstableMockModule('../commands/generate', () => ({
			createGenerateCommand: () => createStubCommand('generate'),
		}));
		await unstableMockModule('../commands/start', () => ({
			createStartCommand: () => createStubCommand('start'),
		}));
		await unstableMockModule('../commands/doctor', () => ({
			createDoctorCommand: () => createStubCommand('doctor'),
		}));

		const next = await import('../index');
		expect(typeof next.createHelper).toBe('function');
		expect(typeof next.createPipeline).toBe('function');
		expect(typeof next.createPatcher).toBe('function');
		expect(typeof next.createWorkspace).toBe('function');
		expect(typeof next.NextApplyCommand).toBe('function');
	});
});
