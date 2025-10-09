export { VERSION } from './version';
export { runCli } from './cli';

export type {
	KernelConfigV1,
	SchemaConfig,
	ResourceConfig,
	RouteConfig,
	CacheKeyTemplate,
	CacheKeyToken,
	QueryParamDescriptor,
	AdaptersConfig,
	PhpAdapterConfig,
	PhpAdapterFactory,
	AdapterContext,
	ConfigOrigin,
	LoadedKernelConfig,
} from './config';

export type {
	IRv1,
	IRSchema,
	IRResource,
	IRRoute,
	IRPolicyHint,
	IRBlock,
	IRPhpProject,
	BuildIrOptions,
} from './ir';

export type { PrinterContext } from './printers';
export type { PhpAstBuilder } from './printers';

export { GenerateCommand, InitCommand, DoctorCommand } from './commands';
