import {
	buildDefaultReadinessRegistry,
	createReadinessRegistry,
	DEFAULT_READINESS_ORDER,
	registerDefaultReadinessHelpers,
} from '../index';

describe('dx readiness configure', () => {
	it('builds a registry with default helpers registered in order', () => {
		const registry = buildDefaultReadinessRegistry();

		const plan = registry.plan(DEFAULT_READINESS_ORDER);

		expect(plan.keys).toEqual([...DEFAULT_READINESS_ORDER]);
	});

	it('registers helpers onto an existing registry', () => {
		const registry = createReadinessRegistry();

		registerDefaultReadinessHelpers(registry);

		const plan = registry.plan(['git']);

		expect(plan.keys).toEqual(['git']);
	});
});
