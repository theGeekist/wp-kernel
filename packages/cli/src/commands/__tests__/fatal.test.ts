import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import { emitFatalError } from '../fatal';

describe('emitFatalError', () => {
	let writeSpy: jest.SpyInstance;

	beforeEach(() => {
		writeSpy = jest
			.spyOn(process.stderr, 'write')
			.mockImplementation(() => true as unknown as number);
	});

	afterEach(() => {
		writeSpy.mockRestore();
	});

	it('writes the message and serialised object context to stderr', () => {
		emitFatalError('Example failure', { reason: 'object' });

		expect(writeSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				`[${WPK_NAMESPACE}.cli][fatal] Example failure {"reason":"object"}`
			)
		);
	});

	it('writes string context as-is', () => {
		emitFatalError('Example', 'string-context');

		expect(writeSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				`[${WPK_NAMESPACE}.cli][fatal] Example string-context`
			)
		);
	});

	it('falls back to inspect output for circular contexts', () => {
		const circular: { self?: unknown } = {};
		circular.self = circular;

		emitFatalError('Circular', circular);

		expect(writeSpy.mock.calls.at(-1)?.[0]).toContain('[Circular');
	});

	it('uses default fatal message when provided string is empty', () => {
		emitFatalError('   ', undefined);

		expect(writeSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				`[${WPK_NAMESPACE}.cli][fatal] Fatal error.`
			)
		);
	});
});
