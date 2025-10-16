import type { Reporter } from '@wpkernel/core/reporter';

export type ReporterLike = Pick<
	Reporter,
	'info' | 'debug' | 'warn' | 'error' | 'child'
>;

export type ReporterMock = Reporter & {
	info: jest.Mock<void, [string, unknown?]>;
	debug: jest.Mock<void, [string, unknown?]>;
	warn: jest.Mock<void, [string, unknown?]>;
	error: jest.Mock<void, [string, unknown?]>;
	child: jest.Mock<ReporterMock, [string]>;
};

export interface ReporterMockOptions {
	childFactory?: (namespace: string) => ReporterMock;
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
