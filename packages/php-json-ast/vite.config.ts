import { createWPKLibConfig } from '../../vite.config.base';

export default createWPKLibConfig(
	'@wpkernel/php-json-ast',
	{
		index: 'src/index.ts',
		builders: 'src/builders.ts',
		channels: 'src/channels.ts',
		nodes: 'src/nodes.ts',
		templates: 'src/templates.ts',
		factories: 'src/factories.ts',
		types: 'src/types.ts',
	},
	{
		external: [/^@wpkernel\/php-driver(\/.*)?$/],
	}
);
