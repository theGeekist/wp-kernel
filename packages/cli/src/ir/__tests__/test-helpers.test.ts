import fs from 'node:fs/promises';
import path from 'node:path';
import {
	sortValue,
	canonicalHash,
	withTempWorkspace,
	withTempSchema,
} from '../shared/test-helpers';

describe('IR test helpers', () => {
	it('sorts values deterministically and normalises undefined', () => {
		const value = {
			b: [2, { d: undefined, c: 3 }],
			a: undefined,
		};
		const sorted = sortValue(value);

		expect(sorted).toEqual({
			a: null,
			b: [2, { c: 3, d: null }],
		});
	});

	it('produces stable hashes for complex structures', () => {
		const hashA = canonicalHash({ foo: 'bar', nested: [1, 2, 3] });
		const hashB = canonicalHash({ nested: [1, 2, 3], foo: 'bar' });
		expect(hashA).toBe(hashB);
	});

	it('manages temporary workspaces and schemas', async () => {
		const touched: string[] = [];
		await withTempWorkspace(
			async (root) => {
				const filePath = path.join(root, 'file.txt');
				await fs.writeFile(filePath, 'hello', 'utf8');
				touched.push(filePath);
			},
			async (root) => {
				const contents = await fs.readFile(
					path.join(root, 'file.txt'),
					'utf8'
				);
				expect(contents).toBe('hello');
			}
		);

		await withTempSchema('{}', async (schemaPath) => {
			const exists = await fs.readFile(schemaPath, 'utf8');
			expect(exists).toBe('{}');
			touched.push(schemaPath);
		});

		for (const filePath of touched) {
			await expect(fs.access(filePath)).rejects.toThrow();
		}
	});
});
