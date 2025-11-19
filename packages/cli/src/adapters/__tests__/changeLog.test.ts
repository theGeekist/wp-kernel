import type { IRv1 } from '../../ir/publicTypes';
import { makeIr } from '@cli-tests/ir.test-support';
import { diffIr } from '../changeLog';

describe('diffIr', () => {
	it('returns add operations when keys are introduced', () => {
		const operations = diffIr(
			makeIr(),
			Object.assign(makeIr(), { foo: 1 })
		);

		expect(operations).toEqual([{ op: 'add', path: '/foo', after: 1 }]);
	});

	it('returns remove operations when keys are removed', () => {
		const operations = diffIr(
			Object.assign(makeIr(), { foo: 'bar' }),
			makeIr()
		);

		expect(operations).toEqual([
			{ op: 'remove', path: '/foo', before: 'bar' },
		]);
	});

	it('returns update operations for changed primitives', () => {
		const operations = diffIr(
			Object.assign(makeIr(), { foo: 1 }),
			Object.assign(makeIr(), { foo: 2 })
		);

		expect(operations).toEqual([
			{ op: 'update', path: '/foo', before: 1, after: 2 },
		]);
	});

	it('skips operations when primitive values are equal', () => {
		const operations = diffIr(
			Object.assign(makeIr(), { foo: true }),
			Object.assign(makeIr(), { foo: true })
		);

		expect(operations).toEqual([]);
	});

	it('returns replace-structure when non-primitive hashes differ', () => {
		const previous = Object.assign({}, makeIr(), {
			foo: { bar: 1 },
		}) as unknown as IRv1;
		const next = Object.assign({}, makeIr(), {
			foo: { bar: 2 },
		}) as unknown as IRv1;

		const operations = diffIr(previous, next);

		expect(operations).toHaveLength(1);
		expect(operations[0]?.op).toBe('replace-structure');
		expect(operations[0]?.path).toBe('/foo');
		expect(operations[0]).toHaveProperty('beforeHash');
		expect(operations[0]).toHaveProperty('afterHash');
		expect(operations[0]?.beforeHash).not.toBe(operations[0]?.afterHash);
	});

	it('skips replace operations when non-primitive hashes match', () => {
		const previous = Object.assign({}, makeIr(), {
			foo: { nested: ['a', 'b'] },
		}) as unknown as IRv1;
		const next = Object.assign({}, makeIr(), {
			foo: { nested: ['a', 'b'] },
		}) as unknown as IRv1;

		const operations = diffIr(previous, next);

		expect(operations).toEqual([]);
	});
});
