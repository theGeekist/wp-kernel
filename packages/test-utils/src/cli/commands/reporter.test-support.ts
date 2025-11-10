import {
	createReporterMock,
	type ReporterFactoryMock,
	type ReporterMock,
	type ReporterMockOptions,
} from '../../shared/reporter.js';

/**
 * Represents a harness for constructing and tracking reporter mocks that share
 * a common child factory.
 */
export interface CommandReporterHarness {
	/** Jest mock that returns a new reporter for each invocation. */
	readonly factory: ReporterFactoryMock;
	/** Ordered collection of every reporter created by the harness. */
	readonly reporters: readonly ReporterMock[];
	/**
	 * Creates a new reporter mock that participates in the shared child
	 * tracking.
	 */
	readonly create: () => ReporterMock;
	/**
	 * Returns the reporter associated with the provided namespace, creating
	 * it when it does not yet exist.
	 */
	readonly useChild: (namespace: string) => ReporterMock;
	/**
	 * Retrieves a reporter by creation order.
	 */
	readonly at: (index: number) => ReporterMock | undefined;
	/**
	 * Looks up a child reporter by namespace if it has been created.
	 */
	readonly getChild: (namespace: string) => ReporterMock | undefined;
	/**
	 * Clears all recorded reporters while keeping the factory instance.
	 */
	readonly reset: () => void;
}

/**
 * Creates a harness for managing command reporter mocks.
 * @param options
 */
export function createCommandReporterHarness(
	options?: ReporterMockOptions
): CommandReporterHarness {
	const reporters: ReporterMock[] = [];
	const children = new Map<string, ReporterMock>();

	function childFactory(namespace: string): ReporterMock {
		const existing = children.get(namespace);
		if (existing) {
			return existing;
		}

		if (options?.childFactory) {
			const custom = options.childFactory(namespace);
			if (custom) {
				children.set(namespace, custom);
				return custom;
			}
		}

		return register(namespace);
	}

	function register(namespace?: string): ReporterMock {
		const reporter = createReporterMock({
			...options,
			childFactory,
		});
		reporters.push(reporter);
		if (namespace) {
			children.set(namespace, reporter);
		}
		return reporter;
	}

	const factory = jest.fn(() => register()) as ReporterFactoryMock;

	return {
		factory,
		get reporters() {
			return reporters;
		},
		create: () => register(),
		useChild: (namespace: string) => childFactory(namespace),
		at: (index: number) => reporters[index],
		getChild: (namespace: string) => children.get(namespace),
		reset: () => {
			reporters.splice(0, reporters.length);
			children.clear();
			factory.mockClear();
		},
	} satisfies CommandReporterHarness;
}
