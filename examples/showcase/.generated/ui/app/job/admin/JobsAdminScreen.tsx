export const jobsadminscreenRoute = '/admin.php?page=wpk-jobs';

import { KernelUIProvider, useKernelUI } from '@wpkernel/ui';
import { ResourceDataView } from '@wpkernel/ui/dataviews';
import { kernel } from '@/bootstrap/kernel';
import { job } from '@/resources/job';

function JobsAdminScreenContent() {
	const runtime = useKernelUI();
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
		throw new KernelError('DeveloperError', {
			message: 'UI runtime not attached.',
			context: { resourceName },
		});
	}

	return (
		<KernelUIProvider runtime={runtime}>
			<JobsAdminScreenContent />
		</KernelUIProvider>
	);
}
