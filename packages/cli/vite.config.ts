import { createKernelLibConfig } from '../../vite.config.base';

export default createKernelLibConfig(
	'@geekist/wp-kernel-cli',
	{
		index: 'src/index.ts',
	},
	{
		external: ['chokidar', 'clipanion', 'cosmiconfig', 'typanion'],
	}
);
