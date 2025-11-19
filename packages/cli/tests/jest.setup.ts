// Reset mocks and timers between tests so suites can share common helpers
// without leaking state.
afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});
