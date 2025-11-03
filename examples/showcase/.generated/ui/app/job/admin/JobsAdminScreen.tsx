export const jobsadminscreenRoute = '/admin.php?page=wpk-jobs';

import { WPKernelUIProvider, useWPKernelUI } from '@wpkernel/ui';
import { ResourceDataView } from '@wpkernel/ui/dataviews';
import { kernel } from '@/bootstrap/kernel';
import { job } from '@/resources/job';

function JobsAdminScreenContent() {
	const runtime = useWPKernelUI();
	return (
		<ResourceDataView
			resource={job}
			config={job.ui?.admin?.dataviews}
			runtime={runtime}
		/>
	);
}

export function JobsAdminScreen() {
	const runtime = kernel.getUIRuntime?.();
	if (!runtime) {
		throw new WPKernelError('DeveloperError', {
			message: 'UI runtime not attached.',
			context: { resourceName },
		});
	}

	return (
		<WPKernelUIProvider runtime={runtime}>
			<JobsAdminScreenContent />
		</WPKernelUIProvider>
	);
}
