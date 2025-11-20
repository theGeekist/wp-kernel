import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import { emitFatalError } from '../fatal';

describe('emitFatalError', () => {
	let writeSpy: jest.SpyInstance;

	beforeEach(() => {
		writeSpy = jest
			.spyOn(process.stderr, 'write')
			.mockImplementation(() => true);
	});

	afterEach(() => {
		writeSpy.mockRestore();
	});

	function createReporter(): Reporter {
		return {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(() => createReporter()),
		};
	}

	it('routes fatal errors through the provided reporter', () => {
		const reporter = createReporter();

		emitFatalError('Example failure', {
			context: { reason: 'object' },
			reporter,
		});

		expect(reporter.error).toHaveBeenCalledWith('Example failure', {
			reason: 'object',
		});
		expect(writeSpy).not.toHaveBeenCalled();
	});

	it('writes the message and serialised object context to stderr when no reporter is provided', () => {
		emitFatalError('Example failure', { context: { reason: 'object' } });

		expect(writeSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				`[${WPK_NAMESPACE}.cli][fatal] Example failure`
			)
		);
		expect(writeSpy).toHaveBeenCalledWith(
			expect.stringContaining('{"reason":"object"}')
		);
	});

	it('writes string context as-is', () => {
		emitFatalError('Example', { context: 'string-context' });

		expect(writeSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				`[${WPK_NAMESPACE}.cli][fatal] Example\nstring-context`
			)
		);
	});

	it('falls back to inspect output for circular contexts', () => {
		const circular: { self?: unknown } = {};
		circular.self = circular;

		emitFatalError('Circular', { context: circular });

		expect(writeSpy.mock.calls.at(-1)?.[0]).toContain('[Circular');
	});

	it('uses default fatal message when provided string is empty', () => {
		emitFatalError('   ', {});

		expect(writeSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				`[${WPK_NAMESPACE}.cli][fatal] Fatal error.`
			)
		);
	});
});
