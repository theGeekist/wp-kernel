/**
 * Mock for @loglayer/transport-simple-pretty-terminal in Jest tests
 * The actual transport is only needed at runtime in Node.js environments
 */

export class SimplePrettyTerminalTransport {
	level: string;
	enabled: boolean;

	constructor(config: { level: string; enabled: boolean }) {
		this.level = config.level;
		this.enabled = config.enabled;
	}

	log(): void {
		// No-op in tests
	}
}
