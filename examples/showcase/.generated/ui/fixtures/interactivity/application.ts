import { WPKernelError, WPK_NAMESPACE } from '@wpkernel/core/contracts';
import {
	createDataViewInteraction,
	type DataViewInteractionResult,
} from '@wpkernel/ui/dataviews';
import {
	type InteractionActionsRecord,
	type InteractionActionInput,
	type HydrateServerStateInput,
} from '@wpkernel/core/interactivity';
import {
	type WPKernelUIRuntime,
	type WPKernelRegistry,
} from '@wpkernel/core/data';
import { createAdminDataViewScreen } from '@wpkernel/ui/dataviews';
import { application } from '@/resources/application';

export const applicationsAdminScreenInteractivityFeature = 'admin-screen';
const applicationsAdminScreenInteractivityResourceName = 'application';

function normalizeApplicationsAdminScreenInteractivitySegment(
	value: string,
	fallback: string
): string {
	const cleaned = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
	return cleaned.length > 0 ? cleaned : fallback;
}

function getApplicationsAdminScreenInteractivityNamespace(): string {
	const resource = application as { storeKey?: string; name?: string };
	const storeKey =
		typeof resource.storeKey === 'string' ? resource.storeKey : '';
	const rawSegment = storeKey.split('/').pop();
	const resourceName =
		typeof resource.name === 'string' && resource.name.length > 0
			? resource.name
			: applicationsAdminScreenInteractivityResourceName;
	const resourceSegment =
		normalizeApplicationsAdminScreenInteractivitySegment(
			rawSegment && rawSegment.length > 0 ? rawSegment : resourceName,
			'resource'
		);
	const featureSegment = normalizeApplicationsAdminScreenInteractivitySegment(
		applicationsAdminScreenInteractivityFeature,
		'feature'
	);
	return `${WPK_NAMESPACE}/${resourceSegment}/${featureSegment}`;
}

export const applicationsAdminScreenInteractivityNamespace =
	getApplicationsAdminScreenInteractivityNamespace();

function buildApplicationsAdminScreenInteractivityActions():
	| InteractionActionsRecord
	| undefined {
	const actions = application.ui?.admin?.dataviews?.actions;
	if (!Array.isArray(actions)) {
		return undefined;
	}
	const bindings: InteractionActionsRecord = {};
	for (const entry of actions) {
		if (!entry || typeof entry !== 'object') {
			continue;
		}
		const candidate = entry as { id?: unknown; action?: unknown };
		if (typeof candidate.id !== 'string' || candidate.id.length === 0) {
			continue;
		}
		if (!candidate.action) {
			continue;
		}
		bindings[candidate.id] = candidate.action as InteractionActionInput<
			unknown,
			unknown
		>;
	}
	return Object.keys(bindings).length > 0 ? bindings : undefined;
}

export const applicationsAdminScreenInteractivityActions =
	buildApplicationsAdminScreenInteractivityActions();

function resolveApplicationsAdminScreenRuntime(
	runtime: WPKernelUIRuntime | undefined
): WPKernelUIRuntime {
	if (runtime) {
		return runtime;
	}
	const resolved = createAdminDataViewScreen.getUIRuntime?.();
	if (!resolved) {
		throw new WPKernelError('DeveloperError', {
			message: 'UI runtime not attached.',
			context: {
				resourceName: applicationsAdminScreenInteractivityResourceName,
			},
		});
	}
	return resolved;
}

export interface CreateApplicationsAdminScreenDataViewInteractionOptions {
	runtime?: WPKernelUIRuntime;
	feature?: string;
	namespace?: string;
	registry?: WPKernelRegistry;
	store?: Record<string, unknown>;
	autoHydrate?: boolean;
	hydrateServerState?: HydrateServerStateInput<unknown, unknown>;
	actions?: InteractionActionsRecord;
}

export function createApplicationsAdminScreenDataViewInteraction(
	options: CreateApplicationsAdminScreenDataViewInteractionOptions = {}
): DataViewInteractionResult<unknown, unknown> {
	const runtime = resolveApplicationsAdminScreenRuntime(options.runtime);
	const namespace =
		options.namespace ?? getApplicationsAdminScreenInteractivityNamespace();
	const feature =
		options.feature ?? applicationsAdminScreenInteractivityFeature;
	const actions =
		options.actions ?? applicationsAdminScreenInteractivityActions;
	return createDataViewInteraction({
		runtime,
		feature,
		resource: application,
		resourceName: applicationsAdminScreenInteractivityResourceName,
		actions,
		namespace,
		registry: options.registry ?? runtime.registry,
		store: options.store,
		autoHydrate: options.autoHydrate,
		hydrateServerState: options.hydrateServerState,
	});
}
