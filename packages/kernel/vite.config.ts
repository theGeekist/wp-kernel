import { createKernelLibConfig } from '../../vite.config.base';

export default createKernelLibConfig('@geekist/wp-kernel', {
	index: 'src/index.ts',
	http: 'src/http/index.ts',
	resource: 'src/resource/index.ts',
	error: 'src/error/index.ts',
});
