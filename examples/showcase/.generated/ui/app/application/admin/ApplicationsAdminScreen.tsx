/** @jsxImportSource @wordpress/element */
import { WPKernelError, WPK_NAMESPACE } from '@wpkernel/core/contracts';
import { WPKernelUIProvider, useWPKernelUI } from '@wpkernel/ui';
import { ResourceDataView } from '@wpkernel/ui/dataviews';
import { createAdminDataViewScreen } from '@wpkernel/ui/dataviews';
import { application } from '@/resources/application';

export const applicationsAdminScreenRoute = 'acme-applications';
const applicationsAdminScreenInteractivityFeature = 'admin-screen';
const applicationsAdminScreenInteractivityContext =
	'{"feature":"admin-screen","resource":"application"}';

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
			: 'application';
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

function ApplicationsAdminScreenContent() {
	const runtime = useWPKernelUI();
	return (
		<ResourceDataView
			resource={application}
			config={application.ui?.admin?.dataviews}
			runtime={runtime}
		/>
	);
}

export function ApplicationsAdminScreen() {
	const runtime = createAdminDataViewScreen.getUIRuntime?.();
	if (!runtime) {
		throw new WPKernelError('DeveloperError', {
			message: 'UI runtime not attached.',
			context: {
				resourceName: 'application',
			},
		});
	}

	const interactivityNamespace =
		getApplicationsAdminScreenInteractivityNamespace();
	return (
		<div
			data-wp-interactive={interactivityNamespace}
			data-wp-context={applicationsAdminScreenInteractivityContext}
		>
			<WPKernelUIProvider runtime={runtime}>
				<ApplicationsAdminScreenContent />
			</WPKernelUIProvider>
		</div>
	);
}
