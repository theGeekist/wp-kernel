import path from 'node:path';

export interface MockFs {
	readonly files: Map<string, Buffer>;
	readFile: jest.Mock<Promise<Buffer>, [string | Buffer | URL | number]>;
	writeFile: jest.Mock<
		Promise<void>,
		[string | Buffer | URL | number, string | NodeJS.ArrayBufferView]
	>;
	access: jest.Mock<Promise<void>, [string | Buffer | URL | number]>;
	existsSync: jest.Mock<boolean, [string | Buffer | URL | number]>;
	stat: jest.Mock<
		Promise<{ isDirectory: () => boolean; isFile: () => boolean }>,
		[string | Buffer | URL | number]
	>;
	rm: jest.Mock<Promise<void>, [string | Buffer | URL | number]>;
}

function toKey(file: string | Buffer | URL | number): string {
	if (typeof file === 'string') {
		return path.resolve(file);
	}
	if (typeof file === 'number') {
		return String(file);
	}
	if (file instanceof URL) {
		return file.toString();
	}

	return file.toString();
}

/**
 * Minimal in-memory fs mock suitable for most CLI tests.
 * Allows seeding files and tracks writes without touching disk.
 * @param seed
 */
export function createMockFs(
	seed: Record<string, string | Buffer> = {}
): MockFs {
	const files = new Map<string, Buffer>();
	for (const [relative, value] of Object.entries(seed)) {
		files.set(
			path.resolve(relative),
			Buffer.isBuffer(value) ? value : Buffer.from(value)
		);
	}

	const readFile = jest.fn(async (file: string | Buffer | URL | number) => {
		const key = toKey(file);
		if (!files.has(key)) {
			throw Object.assign(new Error(`ENOENT: ${key}`), {
				code: 'ENOENT',
			});
		}
		return files.get(key)!;
	});

	const writeFile = jest.fn(
		async (
			file: string | Buffer | URL | number,
			data: string | NodeJS.ArrayBufferView
		) => {
			const key = toKey(file);
			const buffer = Buffer.isBuffer(data)
				? Buffer.from(data)
				: Buffer.from(data as string);
			files.set(key, buffer);
		}
	);

	const access = jest.fn(async (file: string | Buffer | URL | number) => {
		const key = toKey(file);
		if (!files.has(key)) {
			throw Object.assign(new Error(`ENOENT: ${key}`), {
				code: 'ENOENT',
			});
		}
	});

	const existsSync = jest.fn((file: string | Buffer | URL | number) =>
		files.has(toKey(file))
	);

	const stat = jest.fn(async (file: string | Buffer | URL | number) => {
		const key = toKey(file);
		if (!files.has(key)) {
			throw Object.assign(new Error(`ENOENT: ${key}`), {
				code: 'ENOENT',
			});
		}
		return {
			isDirectory: () => false,
			isFile: () => true,
		};
	});

	const rm = jest.fn(async (file: string | Buffer | URL | number) => {
		files.delete(toKey(file));
	});

	return { files, readFile, writeFile, access, existsSync, stat, rm };
}
