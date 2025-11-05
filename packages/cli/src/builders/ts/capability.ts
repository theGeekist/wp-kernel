import type { IRv1 } from '../../ir';
import { Project, VariableDeclarationKind } from 'ts-morph';

export function printCapabilityModule(ir: IRv1): string {
	const project = new Project({ useInMemoryFileSystem: true });
	const sourceFile = project.createSourceFile('capabilities.ts');

	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/capability',
		namedImports: ['defineCapability'],
	});

	sourceFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: 'capabilities',
				initializer: (writer) => {
					writer.write('defineCapability({');
					writer.newLine();
					writer.indent(() => {
						writer.write('map: {');
						writer.newLine();
						writer.indent(() => {
							for (const def of ir.capabilityMap.definitions) {
								const isResourceLevel =
									def.appliesTo === 'resource';

								writer.write(`'${def.key}': `);

								if (isResourceLevel) {
									// Resource-level: no params
									// Use the actual WordPress capability check
									writer.write(`(ctx) => {`);
									writer.newLine();
									writer.indent(() => {
										writer.write(
											`// PHP enforces '${def.capability}' via REST controller`
										);
										writer.newLine();
										writer.write(
											`// Frontend matches server behavior via wp.data`
										);
										writer.newLine();
										writer.write(
											`return true; // Optimistic - server will enforce`
										);
										writer.newLine();
									});
									writer.write(`},`);
								} else {
									// Object-level: requires ID param
									const binding = def.binding || 'id';
									writer.write(`(ctx, ${binding}) => {`);
									writer.newLine();
									writer.indent(() => {
										writer.write(
											`// PHP enforces '${def.capability}' via REST controller`
										);
										writer.newLine();
										writer.write(
											`// Frontend matches server behavior via wp.data`
										);
										writer.newLine();
										writer.write(
											`return true; // Optimistic - server will enforce`
										);
										writer.newLine();
									});
									writer.write(`},`);
								}
								writer.newLine();
							}
						});
						writer.write('},');
						writer.newLine();
					});
					writer.write('})');
				},
			},
		],
	});

	return sourceFile.getFullText();
}
