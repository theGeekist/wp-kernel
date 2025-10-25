jest.mock('../../../commands/doctor', () => {
	const { Command } = jest.requireActual('clipanion') as {
		Command: new () => ClipanionCommand;
	};

	class MockLegacyDoctorCommand extends Command {
		public static readonly executeMock = jest.fn(
			async () => 11 as number | void
		);

		public override async execute(): Promise<number | void> {
			return (
				this.constructor as typeof MockLegacyDoctorCommand
			).executeMock();
		}
	}

	return {
		DoctorCommand: MockLegacyDoctorCommand,
	};
});

import { Command } from 'clipanion';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import * as Delegate from '../internal/delegate';
import { buildDoctorCommand } from '../doctor';
import type { Command as ClipanionCommand } from 'clipanion';

type MockedLegacyModule = {
	readonly DoctorCommand: (new () => ClipanionCommand) & {
		readonly executeMock: jest.Mock<Promise<number | void>, []>;
	};
};

function getMockLegacyDoctor(): MockedLegacyModule['DoctorCommand'] {
	return (jest.requireMock('../../../commands/doctor') as MockedLegacyModule)
		.DoctorCommand;
}

describe('buildDoctorCommand', () => {
	class FakeDoctorCommand extends Command {
		public static readonly executeMock = jest.fn(async () => 7);

		override async execute(): Promise<number> {
			return FakeDoctorCommand.executeMock.call(this);
		}
	}

	beforeEach(() => {
		jest.spyOn(Delegate, 'adoptCommandEnvironment');
		FakeDoctorCommand.executeMock.mockClear();
		getMockLegacyDoctor().executeMock.mockClear();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('delegates execution to the legacy command and adopts the environment', async () => {
		const Doctor = buildDoctorCommand({ command: FakeDoctorCommand });
		const next = new Doctor();

		assignCommandContext(next, { cwd: process.cwd() });

		const result = await next.execute();

		expect(result).toBe(7);
		expect(FakeDoctorCommand.executeMock).toHaveBeenCalledTimes(1);
		expect(Delegate.adoptCommandEnvironment).toHaveBeenCalledTimes(1);

		const delegateInstance =
			FakeDoctorCommand.executeMock.mock.instances[0];
		expect(delegateInstance.cli).toBe(next.cli);
		expect(delegateInstance.context).toBe(next.context);
		expect(delegateInstance.stdout).toBe(next.stdout);
		expect(delegateInstance.stderr).toBe(next.stderr);
	});

	it('loads the legacy command once when using a loader', async () => {
		const loadCommand = jest.fn(async () => FakeDoctorCommand);
		const Doctor = buildDoctorCommand({ loadCommand });

		const first = new Doctor();
		assignCommandContext(first, { cwd: process.cwd() });
		await first.execute();

		const second = new Doctor();
		assignCommandContext(second, { cwd: process.cwd() });
		await second.execute();

		expect(loadCommand).toHaveBeenCalledTimes(1);
	});

	it('falls back to the default loader when no overrides are provided', async () => {
		const loader = jest.fn(async () => getMockLegacyDoctor());
		jest.spyOn(Delegate, 'buildLegacyCommandLoader').mockImplementation(
			({ defaultLoad }) => {
				return async () => loader(await defaultLoad());
			}
		);

		const Doctor = buildDoctorCommand();
		const next = new Doctor();
		assignCommandContext(next, { cwd: process.cwd() });

		const result = await next.execute();

		expect(result).toBe(11);
		expect(loader).toHaveBeenCalledTimes(1);
		expect(getMockLegacyDoctor().executeMock).toHaveBeenCalledTimes(1);
	});
});
