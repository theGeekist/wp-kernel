import { createMemoryReporter } from '../memory-reporter.test-support';

describe('createMemoryReporter', () => {
	it('records log entries with namespace context', () => {
		const reporter = createMemoryReporter('tests');
		reporter.reporter.info('message', { foo: 'bar' });
		reporter.reporter.error('boom');

		expect(reporter.entries).toEqual([
			{
				level: 'info',
				message: 'message',
				namespace: 'tests',
				context: { foo: 'bar' },
			},
			{
				level: 'error',
				message: 'boom',
				namespace: 'tests',
				context: undefined,
			},
		]);
	});

	it('shares state across child reporters', () => {
		const reporter = createMemoryReporter('tests');
		const child = reporter.reporter.child('child');
		child.debug('nested');

		expect(reporter.entries).toEqual([
			{
				level: 'debug',
				message: 'nested',
				namespace: 'tests.child',
				context: undefined,
			},
		]);
	});
});
