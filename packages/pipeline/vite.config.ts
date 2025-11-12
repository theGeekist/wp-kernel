import { createWPKLibConfig } from '../../vite.config.base';

export default createWPKLibConfig('@wpkernel/pipeline', {
	index: 'src/index.ts',
	'extensions/index': 'src/extensions/index.ts',
});
