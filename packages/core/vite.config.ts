import { createKernelLibConfig } from '../../vite.config.base';
import pkg from './package.json';

const external = [
	...Object.keys(pkg.peerDependencies || {}),
	'@wordpress/dataviews',
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/element',
	'loglayer',
	'@loglayer/shared',
	'@loglayer/transport',
];

export default createKernelLibConfig(
	'@wpkernel/core',
	{
		index: 'src/index.ts',
		http: 'src/http/index.ts',
		resource: 'src/resource/index.ts',
		error: 'src/error/index.ts',
		actions: 'src/actions/index.ts',
		data: 'src/data/index.ts',
		policy: 'src/policy/index.ts',
		reporter: 'src/reporter/index.ts',
		contracts: 'src/contracts/index.ts',
	},
	{
		external,
	}
);
