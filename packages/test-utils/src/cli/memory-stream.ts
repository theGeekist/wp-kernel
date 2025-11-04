import { Writable } from 'node:stream';

/**
 * A Writable stream that stores all written data in memory.
 *
 * @category CLI Helpers
 */
export class MemoryStream extends Writable {
	private chunks: string[] = [];

	override _write(
		chunk: string | Buffer,
		_encoding: BufferEncoding,
		callback: (error?: Error | null) => void
	): void {
		this.chunks.push(chunk.toString());
		callback();
	}

	override toString(): string {
		return this.chunks.join('');
	}

	clear(): void {
		this.chunks = [];
	}
}

/**
 * Creates a new `MemoryStream` instance.
 *
 * @category CLI Helpers
 * @returns A new `MemoryStream` instance.
 */
export function createMemoryStream(): MemoryStream {
	return new MemoryStream();
}
