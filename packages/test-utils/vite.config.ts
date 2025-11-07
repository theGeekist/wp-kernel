import { createWPKLibConfig } from '../../vite.config.base';
import pkg from './package.json';

const entries = {
	index: 'src/index.ts',
	'wp/index': 'src/wp/index.ts',
	'integration/index': 'src/integration/index.ts',
	'integration/workspace': 'src/integration/workspace.ts',
	'cli/index': 'src/cli/index.ts',
	'cli/command-context': 'src/cli/command-context.ts',
	'cli/reporter': 'src/cli/reporter.ts',
	'cli/memory-stream': 'src/cli/memory-stream.ts',
	'core/index': 'src/core/index.ts',
	'core/wp-harness': 'src/core/wp-harness.ts',
	'core/action-runtime': 'src/core/action-runtime.ts',
	'ui/index': 'src/ui/index.ts',
	'ui/kernel-ui-harness': 'src/ui/wpkernel-ui-harness.ts',
};

const external = Object.keys(pkg.peerDependencies ?? {});

export default createWPKLibConfig('@wpkernel/test-utils', entries, {
	external,
});
