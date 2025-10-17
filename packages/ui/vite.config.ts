import { createWPKLibConfig } from '../../vite.config.base';
import pkg from './package.json';

const external = [
	...Object.keys(pkg.peerDependencies || {}),
	'@wordpress/dataviews',
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/element',
];

export default createWPKLibConfig(
	'@wpkernel/ui',
	{
		index: 'src/index.ts',
	},
	{
		external,
	}
);
