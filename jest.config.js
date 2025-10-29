import { createRootJestConfig } from './scripts/config/create-root-jest-config.js';

const skipIntegration = process.env.JEST_SKIP_INTEGRATION === '1';

export default createRootJestConfig({
	skipIntegration,
});
