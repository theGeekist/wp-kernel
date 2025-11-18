export interface MockReporter {
	info: jest.Mock<void, [string, unknown?]>;
	warn: jest.Mock<void, [string, unknown?]>;
	error: jest.Mock<void, [string, unknown?]>;
	debug: jest.Mock<void, [string, unknown?]>;
	child: jest.Mock<MockReporter, [string]>;
}

/**
 * Lightweight reporter stub that records calls via Jest mocks.
 */
export function createMockReporter(): MockReporter {
	const build = (namespace: string[]): MockReporter => {
		const info = jest.fn<void, [string, unknown?]>();
		const warn = jest.fn<void, [string, unknown?]>();
		const error = jest.fn<void, [string, unknown?]>();
		const debug = jest.fn<void, [string, unknown?]>();

		const child = jest.fn((segment: string) =>
			build([...namespace, segment])
		);

		return { info, warn, error, debug, child };
	};

	return build([]);
}
