import type { PrinterContext } from '../../types';
import type { IRResource } from '../../../ir';
import type { PhpFileBuilder } from '../builder';
import { makeErrorCodeFactory, isNonEmptyString, toPascalCase } from '../utils';
import { resolveIdentityConfig } from '../identity';
import {
	type IdentityConfig,
	type WpPostMetaDescriptor,
	type WpPostRouteDefinition,
	type WpPostStorage,
	type WpPostTaxonomyDescriptor,
} from './types';
import { collectCanonicalBasePaths } from './routes';

export interface WpPostContext {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
	storage: WpPostStorage;
	pascalName: string;
	identity: IdentityConfig;
	metaEntries: Array<[string, WpPostMetaDescriptor]>;
	taxonomyEntries: Array<[string, WpPostTaxonomyDescriptor]>;
	supports: Set<string>;
	statuses: string[];
	defaultStatus: string;
	canonicalBasePaths: Set<string>;
	errorCode: (suffix: string) => string;
	titleCaseName: () => string;
}

export interface CreateWpPostContextOptions {
	builder: PhpFileBuilder;
	context: PrinterContext;
	resource: IRResource;
	routes: WpPostRouteDefinition[];
}

export function createWpPostContext(
	options: CreateWpPostContextOptions
): WpPostContext {
	const storage = options.resource.storage as WpPostStorage;
	const pascalName = toPascalCase(options.resource.name);
	const identity = resolveIdentityConfig(options.resource);

	const metaEntries = Object.entries(storage.meta ?? {}) as Array<
		[string, WpPostMetaDescriptor]
	>;
	const taxonomyEntries = Object.entries(storage.taxonomies ?? {}) as Array<
		[string, WpPostTaxonomyDescriptor]
	>;
	const supports = new Set(storage.supports ?? []);
	const statuses = Array.isArray(storage.statuses)
		? storage.statuses.filter(isNonEmptyString)
		: [];
	const defaultStatus = statuses[0] ?? 'publish';
	const canonicalBasePaths = collectCanonicalBasePaths(
		options.routes,
		identity.param
	);

	options.builder.addUse('WP_Error');
	options.builder.addUse('WP_Post');
	options.builder.addUse('WP_Query');
	options.builder.addUse('WP_REST_Request');

	const errorCode = makeErrorCodeFactory(options.resource.name);

	const titleCaseName = (): string => pascalName;

	return {
		builder: options.builder,
		context: options.context,
		resource: options.resource,
		storage,
		pascalName,
		identity,
		metaEntries,
		taxonomyEntries,
		supports,
		statuses,
		defaultStatus,
		canonicalBasePaths,
		errorCode,
		titleCaseName,
	};
}
