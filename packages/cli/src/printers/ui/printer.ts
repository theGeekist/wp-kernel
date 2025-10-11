import path from 'node:path';
import type {
	ResourceDataViewsUIConfig,
	ResourceUIConfig,
} from '@geekist/wp-kernel/resource';
import type { PrinterContext } from '../types';

interface ResourceConfigWithUI {
	name: string;
	ui?: ResourceUIConfig;
}

export async function emitUIArtifacts(context: PrinterContext): Promise<void> {
	const resourceEntries = Object.entries(
		context.ir.config.resources as Record<string, ResourceConfigWithUI>
	);

	if (resourceEntries.length === 0) {
		return;
	}

	for (const [resourceKey, resourceConfig] of resourceEntries) {
		const dataviews = resourceConfig.ui?.admin?.dataviews;
		if (!dataviews) {
			continue;
		}

		await emitScreen(context, resourceConfig.name, dataviews);
		await emitFixture(context, resourceConfig.name, dataviews, resourceKey);
		await emitMenuRegistration(context, resourceConfig.name, dataviews);
	}
}

async function emitScreen(
	context: PrinterContext,
	resourceName: string,
	dataviews: ResourceDataViewsUIConfig
): Promise<void> {
	const screenConfig = dataviews.screen ?? {};
	const componentName =
		screenConfig.component ?? `${toPascalCase(resourceName)}AdminScreen`;
	const contentComponentName = `${componentName}Content`;
	const resourceImportPath =
		screenConfig.resourceImport ?? `@/resources/${resourceName}`;
	const resourceImportSymbol =
		screenConfig.resourceSymbol ?? toCamelCase(resourceName);
	const kernelImportPath = screenConfig.kernelImport ?? '@/bootstrap/kernel';
	const kernelImportSymbol = screenConfig.kernelSymbol ?? 'kernel';

	const uiRoot = path.join(context.outputDir, 'ui');
	const screenDir = path.join(uiRoot, 'app', resourceName, 'admin');
	await context.ensureDirectory(screenDir);
	const screenPath = path.join(screenDir, `${componentName}.tsx`);

	const routeExport = screenConfig.route
		? `export const ${toCamelCase(componentName)}Route = '${screenConfig.route}';\n\n`
		: '';

	const contents = `${routeExport}import { KernelUIProvider, useKernelUI } from '@geekist/wp-kernel-ui';
import { ResourceDataView } from '@geekist/wp-kernel-ui/dataviews';
import { ${kernelImportSymbol} } from '${kernelImportPath}';
import { ${resourceImportSymbol} } from '${resourceImportPath}';

function ${contentComponentName}() {
        const runtime = useKernelUI();
        return (
                <ResourceDataView
                        resource={${resourceImportSymbol}}
                        config={${resourceImportSymbol}.ui?.admin?.dataviews}
                        runtime={runtime}
                />
        );
}

export function ${componentName}() {
        const runtime = ${kernelImportSymbol}.getUIRuntime?.();
        if (!runtime) {
                throw new Error('UI runtime not attached.');
        }

        return (
                <KernelUIProvider runtime={runtime}>
                        <${contentComponentName} />
                </KernelUIProvider>
        );
}
`;

	const formatted = await context.formatTs(screenPath, contents);
	await context.writeFile(screenPath, formatted);
}

async function emitFixture(
	context: PrinterContext,
	resourceName: string,
	dataviews: ResourceDataViewsUIConfig,
	resourceKey: string
): Promise<void> {
	const uiRoot = path.join(context.outputDir, 'ui');
	const fixturesDir = path.join(uiRoot, 'fixtures', 'dataviews');
	await context.ensureDirectory(fixturesDir);

	const identifier = `${toCamelCase(resourceName)}DataViewConfig`;
	const fixturePath = path.join(fixturesDir, `${resourceKey}.ts`);
	const serialized = serializeForTs(dataviews);
	const contents = `import type { ResourceDataViewConfig } from '@geekist/wp-kernel-ui/dataviews';

export const ${identifier}: ResourceDataViewConfig<unknown, unknown> = ${serialized};
`;
	const formatted = await context.formatTs(fixturePath, contents);
	await context.writeFile(fixturePath, formatted);
}

async function emitMenuRegistration(
	context: PrinterContext,
	resourceName: string,
	dataviews: ResourceDataViewsUIConfig
): Promise<void> {
	const menu = dataviews.screen?.menu;
	if (!menu) {
		return;
	}

	const namespace = context.ir.meta.sanitizedNamespace;
	const componentName =
		dataviews.screen?.component ??
		`${toPascalCase(resourceName)}AdminScreen`;
	const phpDir = path.join(context.outputDir, 'php', 'Admin');
	await context.ensureDirectory(phpDir);
	const menuPath = path.join(phpDir, `Menu_${componentName}.php`);
	const position =
		typeof menu.position === 'number' ? String(menu.position) : 'null';
	const capability = menu.capability ?? 'manage_options';
	const phpContents = `<?php

declare(strict_types=1);

namespace ${namespace}\\Admin;

use function add_menu_page;

function register_${toCamelCase(componentName)}(): void {
        add_menu_page(
                '${escapePhp(menu.title)}',
                '${escapePhp(menu.title)}',
                '${escapePhp(capability)}',
                '${escapePhp(menu.slug)}',
                function (): void {
                        echo '<div id="${escapePhp(menu.slug)}-app"></div>';
                },
                '',
                ${position}
        );
}
`;
	const formatted = await context.formatPhp(menuPath, phpContents);
	await context.writeFile(menuPath, formatted);
}

function toPascalCase(value: string): string {
	const words = extractWords(value);
	if (words.length === 0) {
		return 'Resource';
	}

	return words
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');
}

function toCamelCase(value: string): string {
	const pascal = toPascalCase(value);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function extractWords(value: string): string[] {
	return value
		.split(/[^A-Za-z0-9]+/u)
		.filter(Boolean)
		.map((segment) => segment.toLowerCase());
}

function serializeForTs(value: unknown, indent = 0): string {
	if (value === null) {
		return 'null';
	}

	if (typeof value === 'function') {
		return serializeFunction(
			value as (...args: unknown[]) => unknown,
			indent
		);
	}

	const primitive = serializePrimitive(value);
	if (primitive !== null) {
		return primitive;
	}

	if (Array.isArray(value)) {
		return serializeArray(value, indent);
	}

	if (typeof value === 'object') {
		return serializeObject(value as Record<string, unknown>, indent);
	}

	return JSON.stringify(value);
}

function serializeFunction(
	value: (...args: unknown[]) => unknown,
	indent: number
): string {
	const source = value.toString();
	if (!source.includes('\n')) {
		return source;
	}

	const indentation = ' '.repeat(indent);
	return source
		.split('\n')
		.map((line, index) => (index === 0 ? line : `${indentation}${line}`))
		.join('\n');
}

function serializePrimitive(value: unknown): string | null {
	if (typeof value === 'string') {
		return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	if (typeof value === 'undefined') {
		return 'undefined';
	}

	if (typeof value === 'symbol') {
		throw new Error('Cannot serialise symbols in DataViews metadata.');
	}

	return null;
}

function serializeArray(values: unknown[], indent: number): string {
	if (values.length === 0) {
		return '[]';
	}

	const nextIndent = indent + 2;
	const items = values.map(
		(item) => `${' '.repeat(nextIndent)}${serializeForTs(item, nextIndent)}`
	);
	return `[\n${items.join(',\n')}\n${' '.repeat(indent)}]`;
}

function serializeObject(
	value: Record<string, unknown>,
	indent: number
): string {
	const entries = Object.entries(value).filter(
		([, entryValue]) => typeof entryValue !== 'undefined'
	);

	if (entries.length === 0) {
		return '{}';
	}

	const nextIndent = indent + 2;
	const lines = entries.map(([key, entryValue]) => {
		const keyName = /^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)
			? key
			: `'${key.replace(/'/g, "\\'")}'`;
		const serialised = serializeForTs(entryValue, nextIndent);
		return `${' '.repeat(nextIndent)}${keyName}: ${serialised}`;
	});

	return `{\n${lines.join(',\n')}\n${' '.repeat(indent)}}`;
}

function escapePhp(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
