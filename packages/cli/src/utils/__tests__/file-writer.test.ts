import path from 'node:path';

import { createMockFs, type MockFs } from '@cli-tests/mocks';
import { FileWriter } from '../file-writer';

jest.mock('node:fs', () => ({
	promises: createMockFs(),
}));

const mockFs = (jest.requireMock('node:fs') as { promises: MockFs }).promises;

describe('FileWriter', () => {
	const target = 'src/example.ts';
	const absolute = path.resolve(target);

	function seedFile(contents: string, file = target): void {
		mockFs.files.set(path.resolve(file), Buffer.from(contents, 'utf8'));
	}

	beforeEach(() => {
		mockFs.files.clear();
		mockFs.readFile.mockClear();
		mockFs.writeFile.mockClear();
	});

	it('writes files when contents change', async () => {
		const writer = new FileWriter();
		const status = await writer.write(target, 'export const value = 1;');

		expect(status).toBe('written');
		expect(mockFs.writeFile).toHaveBeenCalledWith(
			absolute,
			expect.stringContaining('export const value = 1;'),
			'utf8'
		);

		const summary = writer.summarise();
		expect(summary.counts).toEqual({
			written: 1,
			unchanged: 0,
			skipped: 0,
		});
		expect(summary.entries[0]).toMatchObject({ status: 'written' });
	});

	it('avoids writing unchanged files', async () => {
		seedFile('export const value = 2;\n');

		const writer = new FileWriter();
		const status = await writer.write(target, 'export const value = 2;');

		expect(status).toBe('unchanged');
		expect(mockFs.writeFile).not.toHaveBeenCalled();

		const summary = writer.summarise();
		expect(summary.counts).toEqual({
			written: 0,
			unchanged: 1,
			skipped: 0,
		});
	});

	it('records dry-run writes as skipped when contents differ', async () => {
		const writer = new FileWriter({ dryRun: true });
		const status = await writer.write(target, 'const value = 3;');

		expect(status).toBe('skipped');
		expect(mockFs.writeFile).not.toHaveBeenCalled();

		const summary = writer.summarise();
		expect(summary.counts.skipped).toBe(1);
		expect(summary.entries[0]).toMatchObject({ reason: 'dry-run' });
	});

	it('marks dry-run operations as unchanged when hashes match', async () => {
		seedFile('const value = 4;\n');

		const writer = new FileWriter({ dryRun: true });
		const status = await writer.write(target, 'const value = 4;');

		expect(status).toBe('unchanged');
		expect(mockFs.writeFile).not.toHaveBeenCalled();
	});

	it('propagates unexpected read errors', async () => {
		mockFs.readFile.mockRejectedValueOnce(new Error('permission denied'));

		const writer = new FileWriter();
		await expect(writer.write(target, 'const x = 1;')).rejects.toThrow(
			'permission denied'
		);
	});
});
