/** @jsxImportSource @wordpress/element */
import { WPKernelError, WPK_NAMESPACE } from '@wpkernel/core/contracts';
import { WPKernelUIProvider, useWPKernelUI } from '@wpkernel/ui';
import { ResourceDataView } from '@wpkernel/ui/dataviews';
import { createAdminDataViewScreen } from '@wpkernel/ui/dataviews';
import { job } from '@acme/jobs/resources';

export const jobListScreenRoute = 'acme-jobs';
const jobListScreenInteractivityFeature = 'admin-screen';
const jobListScreenInteractivityContext =
	'{"feature":"admin-screen","resource":"job"}';

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
			: 'job';
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

function JobListScreenContent() {
	const runtime = useWPKernelUI();
	return (
		<ResourceDataView
			resource={job}
			config={job.ui?.admin?.dataviews}
			runtime={runtime}
		/>
	);
}

export function JobListScreen() {
	const runtime = createAdminDataViewScreen.getUIRuntime?.();
	if (!runtime) {
		throw new WPKernelError('DeveloperError', {
			message: 'UI runtime not attached.',
			context: {
				resourceName: 'job',
			},
		});
	}

	const interactivityNamespace = getJobListScreenInteractivityNamespace();
	return (
		<div
			data-wp-interactive={interactivityNamespace}
			data-wp-context={jobListScreenInteractivityContext}
		>
			<WPKernelUIProvider runtime={runtime}>
				<JobListScreenContent />
			</WPKernelUIProvider>
		</div>
	);
}
