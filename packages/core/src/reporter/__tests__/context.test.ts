import {
	getKernelReporter,
	setKernelReporter,
	clearKernelReporter,
} from '../index';
import type { Reporter } from '../types';

describe('reporter context', () => {
	afterEach(() => {
		clearKernelReporter();
	});

	it('returns undefined when no reporter set', () => {
		expect(getKernelReporter()).toBeUndefined();
	});

	it('stores and retrieves reporter instances', () => {
		const reporter: Reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn().mockReturnValue({
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				debug: jest.fn(),
				child: jest.fn(),
			} as unknown as Reporter),
		};

		setKernelReporter(reporter);
		expect(getKernelReporter()).toBe(reporter);
	});

	it('clears reporter when requested', () => {
		const reporter: Reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		};

		setKernelReporter(reporter);
		clearKernelReporter();
		expect(getKernelReporter()).toBeUndefined();
	});
});
