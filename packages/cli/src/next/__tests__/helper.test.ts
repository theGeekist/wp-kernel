import { createHelper } from '../helper';

describe('createHelper', () => {
	it('normalises defaults and clones dependencies', async () => {
		const apply = jest.fn();
		const dependsOn = ['a', 'b'];
		const helper = createHelper({
			key: 'test.helper',
			kind: 'fragment',
			dependsOn,
			apply,
		});

		expect(helper.mode).toBe('extend');
		expect(helper.priority).toBe(0);
		expect(helper.dependsOn).toEqual(['a', 'b']);
		expect(helper.dependsOn).not.toBe(dependsOn);

		await helper.apply({
			context: {} as never,
			input: {} as never,
			output: {} as never,
			reporter: { debug: jest.fn() } as never,
		});

		expect(apply).toHaveBeenCalledTimes(1);
		expect(helper.dependsOn).toEqual(['a', 'b']);
	});

	it('wraps synchronous apply functions in a promise', async () => {
		const calls: string[] = [];
		const helper = createHelper({
			key: 'sync.helper',
			kind: 'builder',
			apply: () => {
				calls.push('apply');
			},
		});

		await helper.apply({
			context: {} as never,
			input: {} as never,
			output: {} as never,
			reporter: { debug: jest.fn() } as never,
		});

		expect(calls).toEqual(['apply']);
	});
});
