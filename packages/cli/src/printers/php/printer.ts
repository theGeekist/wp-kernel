import path from 'node:path';
import type { PrinterContext } from '../types';
import { ensureAdapterContext } from './context';
import { createBaseControllerBuilder } from './base-controller';
import { createResourceControllerArtifact } from './resource-controller';
import { createPersistenceRegistryBuilder } from './persistence-registry';
import { createPhpIndexFile } from './index-file';
import { writePhpArtifact } from './writer';
import { warnOnMissingPolicies } from './routes';

export async function emitPhpArtifacts(context: PrinterContext): Promise<void> {
	const phpRoot = path.resolve(context.outputDir, 'php');
	await context.ensureDirectory(phpRoot);

	const namespaceRoot = context.ir.php.namespace;
	const reporter =
		ensureAdapterContext(context).reporter.child('printers.php');

	const baseControllerPath = path.join(phpRoot, 'Rest', 'BaseController.php');
	const baseControllerBuilder = createBaseControllerBuilder(
		namespaceRoot,
		context
	);
	await writePhpArtifact(baseControllerPath, baseControllerBuilder, context);

	const resourceEntries: { className: string; path: string }[] = [];

	for (const resource of context.ir.resources) {
		const localRoutes = resource.routes.filter(
			(route) => route.transport === 'local'
		);

		if (localRoutes.length === 0) {
			continue;
		}

		warnOnMissingPolicies({ reporter, resource, routes: localRoutes });

		const artifact = createResourceControllerArtifact(
			namespaceRoot,
			resource,
			localRoutes,
			context
		);

		const filePath = path.join(
			phpRoot,
			'Rest',
			`${artifact.className}.php`
		);

		await writePhpArtifact(filePath, artifact.builder, context);

		resourceEntries.push({
			className: `${namespaceRoot}\\Rest\\${artifact.className}`,
			path: filePath,
		});
	}

	const persistenceBuilder = createPersistenceRegistryBuilder(
		namespaceRoot,
		context
	);
	const persistencePath = path.join(
		phpRoot,
		'Registration',
		'PersistenceRegistry.php'
	);
	await writePhpArtifact(persistencePath, persistenceBuilder, context);

	const indexPath = path.join(phpRoot, 'index.php');
	const indexContents = createPhpIndexFile({
		indexPath,
		namespaceRoot,
		baseControllerPath,
		resourceEntries,
		persistencePath,
		context,
	});
	const formattedIndex = await context.formatPhp(indexPath, indexContents);
	await context.ensureDirectory(path.dirname(indexPath));
	await context.writeFile(indexPath, formattedIndex);
}
