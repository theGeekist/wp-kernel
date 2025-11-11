import path from 'node:path';
import * as fs from 'node:fs';

import { FileWriter } from '../file-writer';
import { toWorkspaceRelative } from '../path';

jest.mock('../path', () => ({
	toWorkspaceRelative: jest.fn((absolute: string) =>
		absolute.replace(/^\//, 'workspace/')
	),
}));

jest.mock('node:fs', () => ({
	promises: {
		readFile: jest.fn(),
		writeFile: jest.fn(),
	},
}));

const mockedToWorkspaceRelative = jest.mocked(toWorkspaceRelative);
const fsPromises = fs.promises as unknown as {
	readFile: jest.Mock;
	writeFile: jest.Mock;
};

describe('FileWriter', () => {
	function makeEnoent(): NodeJS.ErrnoException {
		const error = new Error('missing') as NodeJS.ErrnoException;
		error.code = 'ENOENT';
		return error;
	}

	beforeEach(() => {
		fsPromises.readFile.mockReset();
		fsPromises.writeFile.mockReset();
		mockedToWorkspaceRelative.mockClear();
	});

	it('writes files when contents change', async () => {
		fsPromises.readFile.mockRejectedValue(makeEnoent());

		const writer = new FileWriter();
		const status = await writer.write(
			'src/example.ts',
			'export const value = 1;'
		);

		expect(status).toBe('written');
		const absolute = path.resolve('src/example.ts');
		expect(fsPromises.writeFile).toHaveBeenCalledWith(
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
		fsPromises.readFile.mockResolvedValue('export const value = 2;\n');

		const writer = new FileWriter();
		const status = await writer.write(
			'src/example.ts',
			'export const value = 2;'
		);

		expect(status).toBe('unchanged');
		expect(fsPromises.writeFile).not.toHaveBeenCalled();

		const summary = writer.summarise();
		expect(summary.counts).toEqual({
			written: 0,
			unchanged: 1,
			skipped: 0,
		});
	});

	it('records dry-run writes as skipped when contents differ', async () => {
		fsPromises.readFile.mockRejectedValue(makeEnoent());

		const writer = new FileWriter({ dryRun: true });
		const status = await writer.write('src/example.ts', 'const value = 3;');

		expect(status).toBe('skipped');
		expect(fsPromises.writeFile).not.toHaveBeenCalled();

		const summary = writer.summarise();
		expect(summary.counts.skipped).toBe(1);
		expect(summary.entries[0]).toMatchObject({ reason: 'dry-run' });
	});

	it('marks dry-run operations as unchanged when hashes match', async () => {
		fsPromises.readFile.mockResolvedValue('const value = 4;\n');

		const writer = new FileWriter({ dryRun: true });
		const status = await writer.write('src/example.ts', 'const value = 4;');

		expect(status).toBe('unchanged');
		expect(fsPromises.writeFile).not.toHaveBeenCalled();
	});

	it('propagates unexpected read errors', async () => {
		fsPromises.readFile.mockRejectedValue(new Error('permission denied'));

		const writer = new FileWriter();
		await expect(
			writer.write('src/example.ts', 'const x = 1;')
		).rejects.toThrow('permission denied');
	});
});
