import {
	createGoldenSnapshot,
	diffGoldenSnapshots,
} from '../integration/golden.js';

const manifestA = {
	generatedAt: '2024-01-01T00:00:00.000Z',
	files: {
		'a.txt': { hash: 'hash-a', size: 10, mode: 0o644 },
	},
};

const manifestB = {
	generatedAt: '2024-01-02T00:00:00.000Z',
	files: {
		'a.txt': { hash: 'hash-b', size: 11, mode: 0o644 },
		'b.txt': { hash: 'hash-b', size: 20, mode: 0o644 },
	},
};

describe('createGoldenSnapshot', () => {
	it('produces stable snapshot objects and diffs', () => {
		const snapshotA = createGoldenSnapshot({ manifest: manifestA });
		const snapshotB = createGoldenSnapshot({
			manifest: manifestB,
			metadata: { version: 2 },
		});

		const diff = diffGoldenSnapshots(snapshotA, snapshotB);
		expect(diff.added).toContain('b.txt');
		expect(diff.changed).toContain('a.txt');
		expect(diff.metadataChanges?.version).toEqual({
			previous: undefined,
			next: 2,
		});
	});
});
