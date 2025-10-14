import { createKernelLibConfig } from '../../vite.config.base';
import pkg from './package.json';

const external = [
	...Object.keys(pkg.peerDependencies || {}),
	'chokidar',
	'clipanion',
	'cosmiconfig',
	'typanion',
	'@wordpress/dataviews',
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/element',
];

export default createKernelLibConfig(
	'@wpkernel/cli',
	{
		index: 'src/index.ts',
	},
	{
		external,
	}
);
