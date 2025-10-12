import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { emitPhpArtifacts } from '../php/printer';
import type { PrinterContext } from '../types';
import type { IRResource, IRSchema, IRv1 } from '../../ir';
import type { KernelConfigV1 } from '../../config/types';

const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-php-printer-');

describe('php printer – wp-post storage', () => {
	it('emits slug-based lookups using get_page_by_path', async () => {
		await withTempDir(async (tempDir) => {
			const context = createPhpPrinterContext(tempDir, {
				identity: {
					type: 'string',
					param: 'slug',
				} as IRResource['identity'],
			});

			await emitPhpArtifacts(context);

			const controllerPath = path.join(
				context.outputDir,
				'php',
				'Rest',
				'PostController.php'
			);
			const contents = await fs.readFile(controllerPath, 'utf8');

			expect(contents).toContain(
				'get_page_by_path( $slug, OBJECT, array( $post_type ) );'
			);
			expect(contents).toContain(
				'return rest_ensure_response( $this->format_post_response( $post ) );'
			);
			expect(contents).not.toContain('is_numeric( $slug )');
		});
	});

	it('queries UUID identities via meta lookups', async () => {
		await withTempDir(async (tempDir) => {
			const context = createPhpPrinterContext(tempDir, {
				identity: {
					type: 'string',
					param: 'uuid',
				} as IRResource['identity'],
			});

			await emitPhpArtifacts(context);

			const controllerPath = path.join(
				context.outputDir,
				'php',
				'Rest',
				'PostController.php'
			);
			const contents = await fs.readFile(controllerPath, 'utf8');

			expect(contents).toContain("'meta_key' => 'uuid'");
			expect(contents).toContain("'meta_value' => $uuid");
			expect(contents).toContain('$query = new WP_Query( array(');
		});
	});

	it('treats custom string identities as slugs without numeric coercion', async () => {
		await withTempDir(async (tempDir) => {
			const context = createPhpPrinterContext(tempDir, {
				identity: {
					type: 'string',
					param: 'handle',
				} as IRResource['identity'],
			});

			await emitPhpArtifacts(context);

			const controllerPath = path.join(
				context.outputDir,
				'php',
				'Rest',
				'PostController.php'
			);
			const contents = await fs.readFile(controllerPath, 'utf8');

			expect(contents).toContain(
				"$handle = $request->get_param( 'handle' );"
			);
			expect(contents).toContain(
				'get_page_by_path( $handle, OBJECT, array( $post_type ) );'
			);
			expect(contents).not.toContain('is_numeric( $handle )');
			expect(contents).not.toContain('$post_id = (int) $handle;');
		});
	});
});

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
	const tempDir = await fs.mkdtemp(TMP_PREFIX);
	try {
		await run(tempDir);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
}

function createPhpPrinterContext(
	tempDir: string,
	overrides: { identity: IRResource['identity'] }
): PrinterContext {
	const ir = createIr(overrides.identity);
	const outputDir = path.join(tempDir, '.generated');

	const context: PrinterContext = {
		ir,
		outputDir,
		configDirectory: tempDir,
		formatPhp: async (_filePath, contents) =>
			ensureTrailingNewline(contents),
		formatTs: async (_filePath, contents) =>
			ensureTrailingNewline(contents),
		writeFile: async (filePath, contents) => {
			await fs.mkdir(path.dirname(filePath), { recursive: true });
			await fs.writeFile(
				filePath,
				ensureTrailingNewline(contents),
				'utf8'
			);
		},
		ensureDirectory: async (directoryPath) => {
			await fs.mkdir(directoryPath, { recursive: true });
		},
	} as PrinterContext;

	return context;
}

function createIr(identity: IRResource['identity']): IRv1 {
	const identityParam =
		identity?.param ?? (identity?.type === 'number' ? 'id' : 'slug');
	const config: KernelConfigV1 = {
		version: 1,
		namespace: 'demo-namespace',
		schemas: {} as KernelConfigV1['schemas'],
		resources: {} as KernelConfigV1['resources'],
	} as KernelConfigV1;

	const schema: IRSchema = {
		key: 'post',
		sourcePath: 'contracts/post.schema.json',
		hash: 'schema-post',
		schema: {
			type: 'object',
			required: ['id', 'title'],
			properties: {
				id: { type: 'integer' },
				title: { type: 'string' },
				status: { type: 'string' },
			},
		},
		provenance: 'manual',
	};

	const resource: IRResource = {
		name: 'post',
		schemaKey: schema.key,
		schemaProvenance: schema.provenance,
		routes: [
			{
				method: 'GET',
				path: '/demo/v1/posts',
				policy: 'posts.read',
				hash: 'route-post-list',
				transport: 'local',
			},
			{
				method: 'GET',
				path: `/demo/v1/posts/:${identityParam}`,
				policy: 'posts.read',
				hash: 'route-post-get',
				transport: 'local',
			},
			{
				method: 'POST',
				path: '/demo/v1/posts',
				policy: 'posts.create',
				hash: 'route-post-create',
				transport: 'local',
			},
			{
				method: 'PUT',
				path: `/demo/v1/posts/:${identityParam}`,
				policy: 'posts.update',
				hash: 'route-post-update',
				transport: 'local',
			},
			{
				method: 'DELETE',
				path: `/demo/v1/posts/:${identityParam}`,
				policy: 'posts.delete',
				hash: 'route-post-delete',
				transport: 'local',
			},
		],
		cacheKeys: {
			list: {
				segments: Object.freeze(['post', 'list']),
				source: 'config',
			},
			get: {
				segments: Object.freeze(['post', 'get', '__wpk_id__']),
				source: 'default',
			},
			create: undefined,
			update: undefined,
			remove: undefined,
		},
		identity,
		storage: {
			mode: 'wp-post',
			postType: 'demo_post',
			statuses: ['draft'],
			supports: ['title', 'editor', 'excerpt'],
			meta: {
				department_code: { type: 'string', single: true },
				tags: { type: 'array', single: false },
			},
			taxonomies: {
				department: { taxonomy: 'demo_department' },
			},
		},
		queryParams: {
			q: { type: 'string', optional: true },
			status: { type: 'enum', enum: ['publish', 'draft'] },
			department: { type: 'string', optional: true },
			department_code: { type: 'string', optional: true },
		},
		ui: undefined,
		hash: 'resource-post',
		warnings: [],
	} as IRResource;

	const ir: IRv1 = {
		meta: {
			version: 1,
			namespace: 'demo-namespace',
			sourcePath: 'kernel.config.ts',
			origin: 'kernel.config.ts',
			sanitizedNamespace: 'Demo\\Namespace',
		},
		config,
		schemas: [schema],
		resources: [resource],
		policies: [],
		blocks: [],
		php: {
			namespace: 'Demo\\Namespace',
			autoload: 'inc/',
			outputDir: '.generated/php',
		},
	};

	return ir;
}

function ensureTrailingNewline(value: string): string {
	return value.endsWith('\n') ? value : `${value}\n`;
}
