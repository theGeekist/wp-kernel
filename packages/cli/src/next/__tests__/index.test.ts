import { Command } from 'clipanion';

function buildStubCommand(name: string) {
	class Stub extends Command {
		static override paths: string[][] = [[name]];

		override async execute(): Promise<void> {
			return undefined;
		}
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
			buildInitCommand: () => buildStubCommand('init'),
		}));
		await unstableMockModule('../commands/generate', () => ({
			buildGenerateCommand: () => buildStubCommand('generate'),
		}));
		await unstableMockModule('../commands/start', () => ({
			buildStartCommand: () => buildStubCommand('start'),
		}));
		await unstableMockModule('../commands/doctor', () => ({
			buildDoctorCommand: () => buildStubCommand('doctor'),
		}));

		const next = await import('../index');
		expect(typeof next.createHelper).toBe('function');
		expect(typeof next.createPipeline).toBe('function');
		expect(typeof next.createPatcher).toBe('function');
		expect(typeof next.buildWorkspace).toBe('function');
		expect(typeof next.NextApplyCommand).toBe('function');
	});
});
