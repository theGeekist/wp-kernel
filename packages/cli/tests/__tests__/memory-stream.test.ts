import { MemoryStream, createMemoryStream } from '../cli';

describe('MemoryStream', () => {
	it('captures written chunks and exposes them via toString', () => {
		const stream = createMemoryStream();

		stream.write('hello');
		stream.write(' world');

		expect(stream.toString()).toBe('hello world');
	});

	it('clears buffered chunks', () => {
		const stream = new MemoryStream();

		stream.write('data');
		expect(stream.toString()).toBe('data');

		stream.clear();

		expect(stream.toString()).toBe('');
	});
});
