import { diffIr } from '../changeLog';

describe('diffIr', () => {
	it('returns add operations when keys are introduced', () => {
		const operations = diffIr({}, { foo: 1 } as unknown as Record<
			string,
			unknown
		>);

		expect(operations).toEqual([{ op: 'add', path: '/foo', after: 1 }]);
	});

	it('returns remove operations when keys are removed', () => {
		const operations = diffIr(
			{ foo: 'bar' } as unknown as Record<string, unknown>,
			{} as unknown as Record<string, unknown>
		);

		expect(operations).toEqual([
			{ op: 'remove', path: '/foo', before: 'bar' },
		]);
	});

	it('returns update operations for changed primitives', () => {
		const operations = diffIr(
			{ foo: 1 } as unknown as Record<string, unknown>,
			{ foo: 2 } as unknown as Record<string, unknown>
		);

		expect(operations).toEqual([
			{ op: 'update', path: '/foo', before: 1, after: 2 },
		]);
	});

	it('skips operations when primitive values are equal', () => {
		const operations = diffIr(
			{ foo: true } as unknown as Record<string, unknown>,
			{ foo: true } as unknown as Record<string, unknown>
		);

		expect(operations).toEqual([]);
	});

	it('returns replace-structure when non-primitive hashes differ', () => {
		const operations = diffIr(
			{ foo: { bar: 1 } } as unknown as Record<string, unknown>,
			{ foo: { bar: 2 } } as unknown as Record<string, unknown>
		);

		expect(operations).toHaveLength(1);
		expect(operations[0]?.op).toBe('replace-structure');
		expect(operations[0]?.path).toBe('/foo');
		expect(operations[0]).toHaveProperty('beforeHash');
		expect(operations[0]).toHaveProperty('afterHash');
		expect(operations[0]?.beforeHash).not.toBe(operations[0]?.afterHash);
	});

	it('skips replace operations when non-primitive hashes match', () => {
		const previous = { foo: { nested: ['a', 'b'] } };
		const next = { foo: { nested: ['a', 'b'] } };

		const operations = diffIr(
			previous as unknown as Record<string, unknown>,
			next as unknown as Record<string, unknown>
		);

		expect(operations).toEqual([]);
	});
});
