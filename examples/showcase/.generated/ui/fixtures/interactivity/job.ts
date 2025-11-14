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
import { job } from '@acme/jobs/resources';

export const jobListScreenInteractivityFeature = 'admin-screen';
const jobListScreenInteractivityResourceName = 'job';

function normalizeJobListScreenInteractivitySegment(
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

function getJobListScreenInteractivityNamespace(): string {
	const resource = job as { storeKey?: string; name?: string };
	const storeKey =
		typeof resource.storeKey === 'string' ? resource.storeKey : '';
	const rawSegment = storeKey.split('/').pop();
	const resourceName =
		typeof resource.name === 'string' && resource.name.length > 0
			? resource.name
			: jobListScreenInteractivityResourceName;
	const resourceSegment = normalizeJobListScreenInteractivitySegment(
		rawSegment && rawSegment.length > 0 ? rawSegment : resourceName,
		'resource'
	);
	const featureSegment = normalizeJobListScreenInteractivitySegment(
		jobListScreenInteractivityFeature,
		'feature'
	);
	return `${WPK_NAMESPACE}/${resourceSegment}/${featureSegment}`;
}

export const jobListScreenInteractivityNamespace =
	getJobListScreenInteractivityNamespace();

function buildJobListScreenInteractivityActions():
	| InteractionActionsRecord
	| undefined {
	const actions = job.ui?.admin?.dataviews?.actions;
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

export const jobListScreenInteractivityActions =
	buildJobListScreenInteractivityActions();

function resolveJobListScreenRuntime(
	runtime: WPKernelUIRuntime | undefined
): WPKernelUIRuntime {
	if (runtime) {
		return runtime;
	}
	const resolved = createAdminDataViewScreen.getUIRuntime?.();
	if (!resolved) {
		throw new WPKernelError('DeveloperError', {
			message: 'UI runtime not attached.',
			context: { resourceName: jobListScreenInteractivityResourceName },
		});
	}
	return resolved;
}

export interface CreateJobListScreenDataViewInteractionOptions {
	runtime?: WPKernelUIRuntime;
	feature?: string;
	namespace?: string;
	registry?: WPKernelRegistry;
	store?: Record<string, unknown>;
	autoHydrate?: boolean;
	hydrateServerState?: HydrateServerStateInput<unknown, unknown>;
	actions?: InteractionActionsRecord;
}

export function createJobListScreenDataViewInteraction(
	options: CreateJobListScreenDataViewInteractionOptions = {}
): DataViewInteractionResult<unknown, unknown> {
	const runtime = resolveJobListScreenRuntime(options.runtime);
	const namespace =
		options.namespace ?? getJobListScreenInteractivityNamespace();
	const feature = options.feature ?? jobListScreenInteractivityFeature;
	const actions = options.actions ?? jobListScreenInteractivityActions;
	return createDataViewInteraction({
		runtime,
		feature,
		resource: job,
		resourceName: jobListScreenInteractivityResourceName,
		actions,
		namespace,
		registry: options.registry ?? runtime.registry,
		store: options.store,
		autoHydrate: options.autoHydrate,
		hydrateServerState: options.hydrateServerState,
	});
}
