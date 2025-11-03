import { flushAsync } from '@wpkernel/test-utils/cli';

describe('flushAsync', () => {
	it('awaits the requested number of microtask turns', async () => {
		const order: number[] = [];

		const run = async () => {
			order.push(1);
			await flushAsync();
			order.push(2);
		};

		await run();

		expect(order).toEqual([1, 2]);
	});

	it('supports custom iteration counts', async () => {
		const order: number[] = [];

		const promise = (async () => {
			order.push(1);
			await flushAsync(1);
			order.push(2);
		})();

		await promise;

		expect(order).toEqual([1, 2]);
	});

	it('optionally advances jest timers', async () => {
		jest.useFakeTimers();

		let fired = false;

		setTimeout(() => {
			fired = true;
		}, 0);

		await flushAsync({ runAllTimers: true });

		expect(fired).toBe(true);
		jest.useRealTimers();
	});
});
