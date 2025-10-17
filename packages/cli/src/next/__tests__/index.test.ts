describe('next index exports', () => {
	it('re-exports builder factories and helpers', async () => {
		const next = await import('../index');
		expect(typeof next.createHelper).toBe('function');
		expect(typeof next.createPipeline).toBe('function');
		expect(typeof next.createPatcher).toBe('function');
		expect(typeof next.createWorkspace).toBe('function');
		expect(typeof next.NextApplyCommand).toBe('function');
	});
});
