import { createKernelLibConfig } from '../../vite.config.base';
import pkg from './package.json';

const external = [
	...Object.keys(pkg.peerDependencies || {}),
	'@wordpress/dataviews',
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/element',
];

export default createKernelLibConfig(
	'@geekist/wp-kernel-ui',
	{
		index: 'src/index.ts',
	},
	{
		external,
	}
);
