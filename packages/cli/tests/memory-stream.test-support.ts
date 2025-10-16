import { Writable } from 'node:stream';

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

export function createMemoryStream(): MemoryStream {
	return new MemoryStream();
}
