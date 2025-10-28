import * as timingModule from '../timing';

const { readMonotonicTime, measureDurationMs } = timingModule;

describe('pipeline timing helpers', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('prefers performance.now when available', () => {
		const now = jest.fn().mockReturnValue(42);
		jest.spyOn(globalThis, 'performance', 'get').mockReturnValue({
			now,
		} as unknown as Performance);

		expect(readMonotonicTime()).toBe(42);
		expect(now).toHaveBeenCalledTimes(1);
	});

	it('falls back to Date.now when performance.now is missing', () => {
		jest.spyOn(globalThis, 'performance', 'get').mockReturnValue(
			undefined as unknown as Performance
		);
		const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(12345);

		expect(readMonotonicTime()).toBe(12345);
		expect(dateSpy).toHaveBeenCalledTimes(1);
	});

	it('clamps negative durations when measuring elapsed time', () => {
		const now = jest.fn().mockReturnValue(50);
		jest.spyOn(globalThis, 'performance', 'get').mockReturnValue({
			now,
		} as unknown as Performance);

		expect(measureDurationMs(100)).toBe(0);
		expect(now).toHaveBeenCalledTimes(1);
	});

	it('calculates positive durations relative to the provided start time', () => {
		const now = jest.fn().mockReturnValue(250);
		jest.spyOn(globalThis, 'performance', 'get').mockReturnValue({
			now,
		} as unknown as Performance);

		expect(measureDurationMs(100)).toBe(150);
		expect(now).toHaveBeenCalledTimes(1);
	});
});
