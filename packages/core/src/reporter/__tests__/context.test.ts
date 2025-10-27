import {
	getWPKernelReporter,
	setWPKernelReporter,
	clearWPKReporter,
} from '../index';
import type { Reporter } from '../types';

describe('reporter context', () => {
	afterEach(() => {
		clearWPKReporter();
	});

	it('returns undefined when no reporter set', () => {
		expect(getWPKernelReporter()).toBeUndefined();
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

		setWPKernelReporter(reporter);
		expect(getWPKernelReporter()).toBe(reporter);
	});

	it('clears reporter when requested', () => {
		const reporter: Reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		};

		setWPKernelReporter(reporter);
		clearWPKReporter();
		expect(getWPKernelReporter()).toBeUndefined();
	});
});
