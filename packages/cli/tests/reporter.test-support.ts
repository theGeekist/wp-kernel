export type ReporterLike = {
	info: (message: string, context?: unknown) => void;
	debug: (message: string, context?: unknown) => void;
	warn: (message: string, context?: unknown) => void;
	error: (message: string, context?: unknown) => void;
	child: (namespace: string) => ReporterLike;
};

export type ReporterMock = ReporterLike & {
	info: jest.Mock;
	debug: jest.Mock;
	warn: jest.Mock;
	error: jest.Mock;
	child: jest.Mock<ReporterMock, [string]>;
};

export interface ReporterMockOptions {
	/**
	 * Custom factory for child reporters. When omitted the child reporter
	 * re-uses the same mock instance.
	 */
	childFactory?: (namespace: string) => ReporterMock;
}

export function createReporterMock({
	childFactory,
}: ReporterMockOptions = {}): ReporterMock {
	const reporter = {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	} as ReporterMock;

	const factory = childFactory ?? (() => reporter);

	reporter.child = jest.fn((namespace: string) =>
		factory(namespace)
	) as ReporterMock['child'];

	return reporter;
}
