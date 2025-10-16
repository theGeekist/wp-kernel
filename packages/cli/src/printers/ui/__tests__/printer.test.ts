import path from 'node:path';
import { emitUIArtifacts } from '../printer';
import type { PrinterContext } from '../../types';
import type { ResourceDataViewsUIConfig } from '@wpkernel/core/resource';
import type { KernelConfigV1 } from '../../../config/types';
import type { IRResource, IRv1 } from '../../../ir';
import { KernelError } from '@wpkernel/core/contracts';

describe('emitUIArtifacts', () => {
	it('writes admin screens, fixtures, and menu registrations using formatters', async () => {
		const dataviews = createDataViewsConfig({
			screen: {
				route: '/admin/jobs',
				component: 'JobsDirectoryScreen',
				resourceImport: '@/custom/resources/jobs',
				resourceSymbol: 'jobsResource',
				kernelImport: '@/custom/kernel',
				kernelSymbol: 'customKernel',
				menu: {
					title: 'Jobs',
					slug: 'jobs',
					position: 42,
					capability: 'manage_jobs',
				},
			},
			table: {
				columns: [
					{
						id: 'title',
						header: 'Title',
						cell: (item: { title: string }) => item.title,
					},
				],
			},
		});

		const { context, writes, ensureDirectory, formatTs, formatPhp } =
			createPrinterContext({ dataviews });

		await emitUIArtifacts(context);

		const screenDir = path.join(
			context.outputDir,
			'ui',
			'app',
			'job',
			'admin'
		);
		const screenPath = path.join(screenDir, 'JobsDirectoryScreen.tsx');
		const fixturePath = path.join(
			context.outputDir,
			'ui',
			'fixtures',
			'dataviews',
			'job.ts'
		);
		const menuPath = path.join(
			context.outputDir,
			'php',
			'Admin',
			'Menu_JobsDirectoryScreen.php'
		);

		expect(ensureDirectory).toHaveBeenCalledWith(screenDir);
		expect(ensureDirectory).toHaveBeenCalledWith(
			path.join(context.outputDir, 'ui', 'fixtures', 'dataviews')
		);
		expect(ensureDirectory).toHaveBeenCalledWith(
			path.join(context.outputDir, 'php', 'Admin')
		);

		expect(formatTs).toHaveBeenCalledWith(
			screenPath,
			expect.stringContaining('export function JobsDirectoryScreen')
		);
		expect(writes.get(screenPath)).toContain(
			"throw new KernelError('DeveloperError',"
		);
		expect(writes.get(screenPath)).toContain(
			"export const jobsdirectoryscreenRoute = '/admin/jobs';"
		);

		expect(formatTs).toHaveBeenCalledWith(
			fixturePath,
			expect.stringContaining('jobDataViewConfig')
		);
		expect(writes.get(fixturePath)).toContain('jobDataViewConfig');
		expect(writes.get(fixturePath)).toContain("header: 'Title'");
		expect(writes.get(fixturePath)).toContain('item.title');

		expect(formatPhp).toHaveBeenCalledWith(
			menuPath,
			expect.stringContaining('add_menu_page')
		);
		expect(writes.get(menuPath)).toContain('register_jobsdirectoryscreen');
		expect(writes.get(menuPath)).toContain("'manage_jobs'");
	});

	it('skips resources without admin DataViews configuration', async () => {
		const { context, writeFile, ensureDirectory } = createPrinterContext({
			dataviews: undefined,
		});

		await emitUIArtifacts(context);

		expect(writeFile).not.toHaveBeenCalled();
		expect(ensureDirectory).not.toHaveBeenCalled();
	});

	it('throws when DataViews metadata contains serialisation symbols', async () => {
		const dataviews = createDataViewsConfig({
			screen: {
				menu: {
					title: 'Reports',
					slug: 'reports',
				},
			},
			table: {
				columns: [
					{
						id: 'status',
						header: 'Status',
						cell: Symbol('forbidden'),
					},
				],
			},
		});

		const { context } = createPrinterContext({ dataviews });

		await expect(emitUIArtifacts(context)).rejects.toBeInstanceOf(
			KernelError
		);
	});
});

type CreatePrinterContextOptions = {
	dataviews?: ResourceDataViewsUIConfig;
};

function createPrinterContext(options: CreatePrinterContextOptions) {
	const outputDir = path.join('/virtual', 'workspace');
	const writes = new Map<string, string>();
	const formatTs = jest.fn(
		async (_filePath: string, contents: string) => contents
	);
	const formatPhp = jest.fn(
		async (_filePath: string, contents: string) => contents
	);
	const ensureDirectory = jest.fn(
		async (_directoryPath: string) => undefined
	);
	const writeFile = jest.fn(async (filePath: string, contents: string) => {
		writes.set(filePath, contents);
	});

	const ir = createIr({ dataviews: options.dataviews });

	const context: PrinterContext = {
		ir,
		outputDir,
		formatPhp,
		formatTs,
		ensureDirectory,
		writeFile,
	};

	return { context, formatTs, formatPhp, ensureDirectory, writeFile, writes };
}

type CreateIrOptions = {
	dataviews?: ResourceDataViewsUIConfig;
};

function createIr(options: CreateIrOptions): IRv1 {
	const config: KernelConfigV1 = {
		version: 1,
		namespace: 'demo-namespace',
		schemas: {},
		resources: {},
	} as KernelConfigV1;

	if (options.dataviews) {
		config.resources = {
			job: {
				name: 'job',
				ui: { admin: { dataviews: options.dataviews } },
			},
		} as KernelConfigV1['resources'];
	} else {
		config.resources = {
			job: { name: 'job' },
		} as KernelConfigV1['resources'];
	}

	const resource: IRResource = {
		name: 'job',
		schemaKey: 'job',
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: {
			list: { segments: Object.freeze(['job']), source: 'config' },
			get: { segments: Object.freeze(['job', 'get']), source: 'config' },
		},
		hash: 'resource-job',
		warnings: [],
	} as unknown as IRResource;

	if (options.dataviews) {
		resource.ui = {
			admin: { dataviews: options.dataviews },
		} as IRResource['ui'];
	}

	const ir: IRv1 = {
		meta: {
			version: 1,
			namespace: 'Demo\\Namespace',
			sanitizedNamespace: 'Demo\\Namespace',
			sourcePath: '/workspace/kernel.config.ts',
			origin: 'file',
		},
		config,
		schemas: [],
		resources: options.dataviews ? [resource] : [],
		policies: [],
		policyMap: {
			sourcePath: undefined,
			definitions: [],
			fallback: { capability: 'manage_options', appliesTo: 'resource' },
			missing: [],
			unused: [],
			warnings: [],
		},
		blocks: [],
		php: {
			namespace: 'Demo\\Namespace',
			autoload: 'inc/',
			outputDir: '.generated/php',
		},
	};

	return ir;
}

type DataViewsBlueprint = Partial<ResourceDataViewsUIConfig> & {
	screen?: ResourceDataViewsUIConfig['screen'];
};

function createDataViewsConfig(
	blueprint: DataViewsBlueprint
): ResourceDataViewsUIConfig {
	return {
		...blueprint,
	} as ResourceDataViewsUIConfig;
}
