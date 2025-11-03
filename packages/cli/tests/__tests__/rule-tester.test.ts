import {
	createRuleTester,
	buildWPKernelConfigFixture,
	buildDocComment,
} from '../rule-tester.test-support.js';

describe('@wpkernel/cli rule tester helpers', () => {
	it('creates a RuleTester wired to the TypeScript parser', () => {
		const tester = createRuleTester();
		expect(typeof tester.run).toBe('function');
	});

	it('builds config fixtures with default header and footer', () => {
		const fixture = buildWPKernelConfigFixture('const resource = {};\n');
		expect(fixture).toContain('normalizeKeyValue');
		expect(fixture).toContain('export const wpkConfig');
	});

	it('produces documentation comments pointing to canonical guidance', () => {
		expect(buildDocComment()).toContain('For CLI config guidance');
	});
});
