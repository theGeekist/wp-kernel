import { createWPKLibConfig } from '../../vite.config.base';

export default createWPKLibConfig(
	'@wpkernel/wp-json-ast',
	{
		index: 'src/index.ts',
	},
	{
		external: [/^@wpkernel\/php-json-ast(\/.*)?$/],
	}
);
