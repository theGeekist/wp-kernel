import type { Reporter } from '@wpkernel/core/reporter';

/**
 * A subset of the Reporter interface, focusing on logging methods.
 *
 * @category CLI Helpers
 */
export type ReporterLike = Pick<
	Reporter,
	'info' | 'debug' | 'warn' | 'error' | 'child'
>;

/**
 * A mock implementation of the Reporter interface for testing purposes.
 *
 * @category CLI Helpers
 */
export type ReporterMock = Reporter & {
	info: jest.Mock<void, [string, unknown?]>;
	debug: jest.Mock<void, [string, unknown?]>;
	warn: jest.Mock<void, [string, unknown?]>;
	error: jest.Mock<void, [string, unknown?]>;
	child: jest.Mock<ReporterMock, [string]>;
};

/**
 * Jest mock type for reporter factory helpers.
 */
export type ReporterFactoryMock = jest.Mock<ReporterMock, []>;

/**
 * Options for creating a `ReporterMock`.
 *
 * @category CLI Helpers
 */
export interface ReporterMockOptions {
	/** A factory function to create child reporter mocks. */
	childFactory?: (namespace: string) => ReporterMock;
	/** Partial overrides for the reporter methods. */
	overrides?: Partial<Reporter>;
}

function createMethodMock(
	override: Reporter['info'] | undefined
): jest.Mock<void, [string, unknown?]> {
	if (!override) {
		return jest.fn();
	}

	return jest.fn((message: string, context?: unknown) => {
		return override(message, context);
	});
}

/**
 * Creates a mock reporter for testing purposes.
 *
 * @category CLI Helpers
 * @param    options.childFactory
 * @param    options.overrides
 * @param    options              - Options for configuring the mock reporter.
 * @returns A `ReporterMock` instance.
 */
export function createReporterMock({
	childFactory,
	overrides,
}: ReporterMockOptions = {}): ReporterMock {
	const reporter = {
		info: createMethodMock(overrides?.info),
		debug: createMethodMock(overrides?.debug),
		warn: createMethodMock(overrides?.warn),
		error: createMethodMock(overrides?.error),
	} as ReporterMock;

	const fallbackChildFactory =
		childFactory ?? (() => reporter as ReporterMock);

	if (overrides?.child) {
		const overrideChild = overrides.child;
		reporter.child = jest.fn((namespace: string) => {
			const next = overrideChild(namespace);
			return (next ?? reporter) as ReporterMock;
		}) as ReporterMock['child'];
	} else {
		reporter.child = jest.fn((namespace: string) =>
			fallbackChildFactory(namespace)
		) as ReporterMock['child'];
	}

	return reporter;
}

/**
 * Creates a jest mock factory that returns `ReporterMock` instances.
 * @param options
 */
export function createReporterFactory(
	options?: ReporterMockOptions
): ReporterFactoryMock {
	const factory = jest.fn(() => createReporterMock(options));
	return factory as ReporterFactoryMock;
}
