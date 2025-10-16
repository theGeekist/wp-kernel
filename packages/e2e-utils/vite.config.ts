import { createKernelLibConfig } from '../../vite.config.base';
import pkg from './package.json';

const external = [
	...Object.keys(pkg.peerDependencies || {}),
	...Object.keys(pkg.dependencies || {}),
	/^@wpkernel\/test-utils(\/.*)?$/,
	// Add any additional externals specific to e2e-utils here if needed
];

export default createKernelLibConfig(
	'@wpkernel/e2e-utils',
	{ index: 'src/index.ts' },
	{ external }
);
