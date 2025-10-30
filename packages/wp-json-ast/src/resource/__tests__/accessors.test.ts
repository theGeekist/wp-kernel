import { buildResourceAccessors } from '../accessors';
import type { ResourceAccessorDescriptor } from '../accessors';

describe('buildResourceAccessors', () => {
	it('collects descriptors for each storage kind', () => {
		const helperDescriptor: ResourceAccessorDescriptor = {
			id: 'helper',
			summary: 'Helper descriptor',
			value: { value: 'helper' },
		};
		const mutationDescriptor: ResourceAccessorDescriptor = {
			id: 'mutation',
			value: { value: 'mutation' },
		};

		const accessors = buildResourceAccessors({
			storages: [
				{
					kind: 'wpPost',
					label: 'WP_Post',
					register({ addHelper, addMutation }) {
						addHelper(helperDescriptor);
						addMutation(mutationDescriptor);
					},
				},
			],
		});

		const wpPost = accessors.storagesByKind.get('wpPost');
		expect(wpPost).toBeDefined();
		expect(wpPost?.helpers).toEqual([helperDescriptor]);
		expect(wpPost?.mutations).toEqual([mutationDescriptor]);
	});

	it('freezes descriptor collections', () => {
		const accessors = buildResourceAccessors({
			storages: [
				{
					kind: 'wpOption',
					label: 'WP_Option',
					register({ addRequest, addCache }) {
						addRequest({
							id: 'request',
							value: { value: 'request' },
						});
						addCache({ id: 'cache', value: { value: 'cache' } });
					},
				},
			],
		});

		const wpOption = accessors.storages[0];

		if (!wpOption) {
			throw new Error('Expected wpOption storage accessors');
		}

		expect(() => {
			(wpOption.requests as ResourceAccessorDescriptor[]).push({
				id: 'extra',
				value: {},
			});
		}).toThrow();

		expect(() => {
			(wpOption.caches as ResourceAccessorDescriptor[]).push({
				id: 'extra-cache',
				value: {},
			});
		}).toThrow();

		expect(Object.isFrozen(wpOption)).toBe(true);
	});

	it('throws when registering the same storage twice', () => {
		expect(() =>
			buildResourceAccessors({
				storages: [
					{
						kind: 'duplicate',
						label: 'Duplicate',
						register() {
							// noop
						},
					},
					{
						kind: 'duplicate',
						label: 'Duplicate copy',
						register() {
							// noop
						},
					},
				],
			})
		).toThrow('Resource accessors already registered for kind: duplicate');
	});
});
