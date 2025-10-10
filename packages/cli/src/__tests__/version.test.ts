import { VERSION } from '../version';

describe('VERSION export', () => {
	it('exposes the npm package version when process is available', () => {
		expect(typeof VERSION).toBe('string');
		expect(VERSION.length).toBeGreaterThan(0);
	});
});
