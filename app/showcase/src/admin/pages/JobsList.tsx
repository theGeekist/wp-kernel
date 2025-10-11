import { useCallback, useMemo, useState } from '@wordpress/element';
import { Flex, FlexItem, Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { KernelError } from '@geekist/wp-kernel/error';
import type { DefinedAction } from '@geekist/wp-kernel/actions';
import { useKernelUI } from '@geekist/wp-kernel-ui';
import {
	ResourceDataView,
	createDataFormController,
	ensureControllerRuntime,
	type DataViewsRuntimeContext,
	type ResourceDataViewConfig,
} from '@geekist/wp-kernel-ui/dataviews';
import type { ResourceObject } from '@geekist/wp-kernel/resource';
import { job } from '../../resources';
import type { Job } from '../../../.generated/types/job';
import { kernelConfig, type JobListParams } from '../../kernel.config';
import { JobCreatePanel } from '../../views/jobs/JobCreatePanel';
import { CreateJob, type CreateJobInput } from '../../actions/jobs/CreateJob';

type CreateFeedback = { type: 'success' | 'error'; message: string } | null;

function useDataViewsRuntimeContext(): DataViewsRuntimeContext {
	const runtime = useKernelUI();
	if (!runtime?.dataviews) {
		throw new KernelError('DeveloperError', {
			message:
				'Kernel UI runtime is missing DataViews support. Ensure attachUIBindings configured DataViews.',
		});
	}

	return {
		namespace: runtime.namespace,
		dataviews: ensureControllerRuntime(runtime.dataviews),
		policies: runtime.policies,
		invalidate: runtime.invalidate,
		registry: runtime.registry,
		reporter: runtime.reporter,
		kernel: runtime.kernel,
	} satisfies DataViewsRuntimeContext;
}

const SUCCESS_MESSAGE = __('Job created successfully.', 'wp-kernel-showcase');
const ERROR_FALLBACK = __(
	'Unable to create the job. Please try again.',
	'wp-kernel-showcase'
);

const createJobAction: DefinedAction<CreateJobInput, Job> = Object.assign(
	(input: CreateJobInput) => CreateJob(input),
	{
		actionName: 'Jobs.Create',
		options: { scope: 'crossTab', bridged: true } as const,
	}
);

export function JobsList(): JSX.Element {
	const runtimeContext = useDataViewsRuntimeContext();
	const [feedback, setFeedback] = useState<CreateFeedback>(null);

	const controllerFactory = useMemo(
		() =>
			createDataFormController<CreateJobInput, Job, JobListParams>({
				action: createJobAction,
				runtime: runtimeContext,
				resource: job as ResourceObject<unknown, JobListParams>,
				resourceName: job.name,
			}),
		[runtimeContext]
	);

	const controller = controllerFactory();
	const dataViewConfig = kernelConfig.resources.job.ui?.admin
		?.dataviews as unknown as
		| ResourceDataViewConfig<Job, JobListParams>
		| undefined;

	const handleSubmit = useCallback(
		async (input: CreateJobInput) => {
			setFeedback(null);

			try {
				await controller.submit(input);
				setFeedback({ type: 'success', message: SUCCESS_MESSAGE });
				controller.reset();
			} catch (error) {
				const message = KernelError.isKernelError(error)
					? error.message
					: ERROR_FALLBACK;
				setFeedback({ type: 'error', message });
			}
		},
		[controller]
	);

	const isSubmitting = controller.state.status === 'running';

	const emptyState = useMemo(
		() => (
			<Notice status="info" isDismissible={false}>
				{__(
					'No jobs found yet. Create one to get started.',
					'wp-kernel-showcase'
				)}
			</Notice>
		),
		[]
	);

	if (!dataViewConfig) {
		return (
			<div className="jobs-admin" data-testid="jobs-admin-root">
				<Notice status="warning" isDismissible={false}>
					{__(
						'Jobs resource is missing DataViews configuration. Check kernel.config.ts.',
						'wp-kernel-showcase'
					)}
				</Notice>
			</div>
		);
	}

	return (
		<div className="jobs-admin" data-testid="jobs-admin-root">
			<h1>{__('Careers showcase', 'wp-kernel-showcase')}</h1>

			<Flex align="flex-start" wrap style={{ gap: '32px' }}>
				<FlexItem style={{ flex: '0 0 320px', minWidth: '280px' }}>
					<JobCreatePanel
						onSubmit={handleSubmit}
						isSubmitting={isSubmitting}
						feedback={feedback}
					/>
				</FlexItem>
				<FlexItem style={{ flex: '1 1 520px', minWidth: '320px' }}>
					<ResourceDataView<Job, JobListParams>
						resource={job}
						config={dataViewConfig}
						emptyState={emptyState}
					/>
				</FlexItem>
			</Flex>
		</div>
	);
}
