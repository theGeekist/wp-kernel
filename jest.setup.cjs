/**
 * Jest setup file
 * Runs before each test file
 */

// Add custom matchers if needed
// import '@testing-library/jest-dom';

// Global test configuration
global.console = {
	...console,
	// Suppress console errors/warnings in tests unless needed
	// error: jest.fn(),
	// warn: jest.fn(),
};

// Mock WordPress globals that might be used in tests
global.wp = global.wp || {};
global.wpApiSettings = global.wpApiSettings || {
	root: 'http://localhost:8889/wp-json/',
	nonce: 'test-nonce',
};
