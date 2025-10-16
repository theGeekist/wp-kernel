import { createReporterMock } from '../reporter.test-support';

describe('createReporterMock', () => {
	it('creates isolated jest mocks for reporter methods', () => {
		const reporter = createReporterMock();

		reporter.info('message');
		reporter.debug('debug');
		reporter.warn('warn');
		reporter.error('error');
		const child = reporter.child('child');

		expect(reporter.info).toHaveBeenCalledWith('message');
		expect(reporter.debug).toHaveBeenCalledWith('debug');
		expect(reporter.warn).toHaveBeenCalledWith('warn');
		expect(reporter.error).toHaveBeenCalledWith('error');
		expect(child).toBe(reporter);
	});

	it('uses the provided child factory when defined', () => {
		const childReporter = createReporterMock();
		const reporter = createReporterMock({
			childFactory: () => childReporter,
		});

		expect(reporter.child('child')).toBe(childReporter);
		expect(reporter.child).toHaveBeenCalledTimes(1);
	});
});
