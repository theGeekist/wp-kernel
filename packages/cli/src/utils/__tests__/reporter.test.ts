import { WPKernelHooksTransport } from '@wpkernel/core/reporter';
import type { Reporter } from '@wpkernel/core/reporter';
import { createReporterCLI } from '../reporter';

describe('createReporterCLI', () => {
	let writeSpy: jest.SpyInstance;

	beforeEach(() => {
		writeSpy = jest
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true);
	});

	afterEach(() => {
		writeSpy.mockRestore();
	});

	it('writes colored lines to stdout for info/warn', () => {
		const reporter: Reporter = createReporterCLI();

		reporter.info('hello');
		reporter.warn('warn', { foo: 'bar' });

		expect(writeSpy).toHaveBeenCalledWith(
			expect.stringContaining('INFO hello\n')
		);
		expect(writeSpy).toHaveBeenCalledWith(
			expect.stringContaining('WARN warn')
		);
	});

	it('does nothing when disabled', () => {
		const reporter: Reporter = createReporterCLI({ enabled: false });

		reporter.error('boom');

		expect(writeSpy).not.toHaveBeenCalled();
	});

	it('emits hook transport when channel is hooks/all', () => {
		const hookSpy = jest
			.spyOn(WPKernelHooksTransport.prototype, 'shipToLogger')
			.mockImplementation(() => []);

		const reporter: Reporter = createReporterCLI({ channel: 'hooks' });
		reporter.info('hooked', { foo: 'bar' });

		expect(hookSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				logLevel: 'info',
				messages: ['hooked'],
			})
		);

		hookSpy.mockRestore();
	});

	it('supports child reporters', () => {
		const reporter: Reporter = createReporterCLI({ namespace: 'cli' });

		reporter.child('dx').info('child');

		expect(writeSpy).toHaveBeenCalledWith(
			expect.stringContaining('INFO child')
		);
	});
});
