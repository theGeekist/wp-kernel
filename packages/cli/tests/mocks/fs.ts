import path from 'node:path';

export interface MockFs {
	readonly files: Map<string, Buffer>;
	readFile: jest.Mock<
		Promise<Buffer | string>,
		[string | Buffer | URL | number, BufferEncoding?]
	>;
	readFileSync: jest.Mock<
		Buffer | string,
		[string | Buffer | URL | number, BufferEncoding?]
	>;
	writeFile: jest.Mock<
		Promise<void>,
		[
			string | Buffer | URL | number,
			string | NodeJS.ArrayBufferView,
			BufferEncoding?,
		]
	>;
	access: jest.Mock<Promise<void>, [string | Buffer | URL | number]>;
	exists: jest.Mock<Promise<boolean>, [string | Buffer | URL | number]>;
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

	const readFile = jest.fn(
		async (
			file: string | Buffer | URL | number,
			encoding?: BufferEncoding
		) => {
			const key = toKey(file);
			if (!files.has(key)) {
				throw Object.assign(new Error(`ENOENT: ${key}`), {
					code: 'ENOENT',
				});
			}
			const contents = files.get(key)!;
			if (encoding) {
				return contents.toString(encoding);
			}
			return contents;
		}
	);

	const readFileSync = jest.fn(
		(file: string | Buffer | URL | number, encoding?: BufferEncoding) => {
			const key = toKey(file);
			if (!files.has(key)) {
				throw Object.assign(new Error(`ENOENT: ${key}`), {
					code: 'ENOENT',
				});
			}
			const contents = files.get(key)!;
			if (encoding) {
				return contents.toString(encoding);
			}
			return contents;
		}
	);

	const writeFile = jest.fn(
		async (
			file: string | Buffer | URL | number,
			data: string | NodeJS.ArrayBufferView,
			encoding?: BufferEncoding
		) => {
			const key = toKey(file);
			const buffer = Buffer.isBuffer(data)
				? Buffer.from(data)
				: Buffer.from(data as string, encoding);
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

	const exists = jest.fn(async (file: string | Buffer | URL | number) => {
		const key = toKey(file);
		return files.has(key);
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

	return {
		files,
		readFile,
		readFileSync,
		writeFile,
		access,
		exists,
		existsSync,
		stat,
		rm,
	};
}
