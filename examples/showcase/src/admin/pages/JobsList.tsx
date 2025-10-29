import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import {
	Button,
	Card,
	CardBody,
	CardHeader,
	Flex,
	FlexItem,
	Notice,
	Spinner,
} from '@wordpress/components';
import { DataForm } from '@wordpress/dataviews';
import { __ } from '@wordpress/i18n';
import { WPKernelError } from '@wpkernel/core/error';
import type { DefinedAction } from '@wpkernel/core/actions';
import { useWPKernelUI } from '@wpkernel/ui';
import {
	ResourceDataView,
	createDataFormController,
	ensureControllerRuntime,
	type DataViewsRuntimeContext,
} from '@wpkernel/ui/dataviews';
import type { ResourceObject } from '@wpkernel/core/resource';
import { job } from '../../resources';
import {
	wpkConfig,
	jobCreationFields,
	jobCreationForm,
	jobDataViewsConfig,
	type Job,
	type JobListParams,
} from '../../wpk.config';
import { CreateJob, type CreateJobInput } from '../../actions/jobs/CreateJob';

type CreateFeedback = { type: 'success' | 'error'; message: string } | null;

const DEFAULT_STATUS: CreateJobInput['status'] = 'draft';

const createDefaultFormState = (): CreateJobInput => ({
	title: '',
	department: '',
	location: '',
	description: '',
	status: DEFAULT_STATUS,
});

const normalizeStatus = (value: unknown): CreateJobInput['status'] => {
	if (value === 'publish' || value === 'closed' || value === 'draft') {
		return value;
	}
	return DEFAULT_STATUS;
};

function useDataViewsRuntimeContext(): DataViewsRuntimeContext {
	const runtime = useWPKernelUI();
	if (!runtime?.dataviews) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Kernel UI runtime is missing DataViews support. Ensure attachUIBindings configured DataViews.',
		});
	}

	return {
		namespace: runtime.namespace,
		dataviews: ensureControllerRuntime(runtime.dataviews),
		capabilities: runtime.capabilities,
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

function useJobResource(): {
	resource: ResourceObject<Job, JobListParams> | null;
	error: string | null;
} {
	const [resource, setResource] = useState<ResourceObject<
		Job,
		JobListParams
	> | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		Promise.resolve(job)
			.then((resourceObject) => {
				if (!isMounted) {
					return;
				}
				setResource(resourceObject);
			})
			.catch((caught) => {
				if (!isMounted) {
					return;
				}

				const message = WPKernelError.isWPKernelError(caught)
					? caught.message
					: __(
							'Unable to load the jobs resource. Check console output for details.',
							'wp-kernel-showcase'
						);

				setError(message);
				console.error(
					'[WP Kernel Showcase] Failed to resolve job resource:',
					caught
				);
			});

		return () => {
			isMounted = false;
		};
	}, []);

	return { resource, error };
}

export function JobsList(): JSX.Element {
	const runtimeContext = useDataViewsRuntimeContext();
	const [feedback, setFeedback] = useState<CreateFeedback>(null);
	const [formState, setFormState] = useState<CreateJobInput>(
		createDefaultFormState()
	);
	const { resource: resolvedResource, error: resourceError } =
		useJobResource();

	const controllerFactory = useMemo(() => {
		if (!resolvedResource) {
			return null;
		}

		return createDataFormController<CreateJobInput, Job, JobListParams>({
			action: createJobAction,
			runtime: runtimeContext,
			resource: resolvedResource as ResourceObject<
				unknown,
				JobListParams
			>,
			resourceName: resolvedResource.name,
		});
	}, [resolvedResource, runtimeContext]);

	const controller = useMemo(
		() => controllerFactory?.(),
		[controllerFactory]
	);
	const hasConfiguredDataViews = Boolean(
		wpkConfig.resources.job.ui?.admin?.dataviews
	);

	const handleFormChange = useCallback((updates: Record<string, unknown>) => {
		setFeedback(null);
		setFormState((previous) => {
			const next: CreateJobInput = { ...previous };

			if ('title' in updates) {
				next.title =
					typeof updates.title === 'string' ? updates.title : '';
			}

			if ('department' in updates) {
				next.department =
					typeof updates.department === 'string'
						? updates.department
						: '';
			}

			if ('location' in updates) {
				next.location =
					typeof updates.location === 'string'
						? updates.location
						: '';
			}

			if ('description' in updates) {
				next.description =
					typeof updates.description === 'string'
						? updates.description
						: '';
			}

			if ('status' in updates) {
				next.status = normalizeStatus(updates.status);
			}

			return next;
		});
	}, []);

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

	if (resourceError) {
		return (
			<div className="jobs-admin" data-testid="jobs-admin-root">
				<Notice status="error" isDismissible={false}>
					{resourceError}
				</Notice>
			</div>
		);
	}

	if (!hasConfiguredDataViews) {
		return (
			<div className="jobs-admin" data-testid="jobs-admin-root">
				<Notice status="warning" isDismissible={false}>
					{__(
						'Jobs resource is missing DataViews configuration. Check wpk.config.ts.',
						'wp-kernel-showcase'
					)}
				</Notice>
			</div>
		);
	}

	if (!resolvedResource || !controller) {
		return (
			<div className="jobs-admin" data-testid="jobs-admin-root">
				<Flex
					align="center"
					justify="center"
					style={{ minHeight: '240px' }}
				>
					<Spinner />
				</Flex>
			</div>
		);
	}

	const confirmedController = controller as NonNullable<typeof controller>;

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFeedback(null);

		try {
			await confirmedController.submit(formState);
			setFeedback({ type: 'success', message: SUCCESS_MESSAGE });
			setFormState(createDefaultFormState());
			confirmedController.reset();
		} catch (error) {
			const message = WPKernelError.isWPKernelError(error)
				? error.message
				: ERROR_FALLBACK;
			setFeedback({ type: 'error', message });
		}
	};

	const isSubmitting = confirmedController.state.status === 'running';

	return (
		<div className="jobs-admin" data-testid="jobs-admin-root">
			<h1>{__('Careers showcase', 'wp-kernel-showcase')}</h1>

			<Flex align="flex-start" wrap style={{ gap: '32px' }}>
				<FlexItem style={{ flex: '0 0 320px', minWidth: '280px' }}>
					<Card data-testid="job-create-panel">
						<CardHeader>
							<h2>
								{__('Add a job posting', 'wp-kernel-showcase')}
							</h2>
						</CardHeader>
						<CardBody>
							{feedback && (
								<div data-testid="job-create-feedback">
									<Notice
										status={
											feedback.type === 'success'
												? 'success'
												: 'error'
										}
										isDismissible={false}
									>
										{feedback.message}
									</Notice>
								</div>
							)}
							<form
								onSubmit={handleSubmit}
								data-testid="job-create-form"
							>
								<DataForm
									data={formState as unknown as Job}
									fields={jobCreationFields}
									form={jobCreationForm}
									onChange={handleFormChange}
								/>
								<Button
									type="submit"
									variant="primary"
									isBusy={isSubmitting}
									disabled={isSubmitting}
									data-testid="job-submit-button"
								>
									{isSubmitting
										? __(
												'Creating job…',
												'wp-kernel-showcase'
											)
										: __(
												'Create job',
												'wp-kernel-showcase'
											)}
								</Button>
							</form>
						</CardBody>
					</Card>
				</FlexItem>
				<FlexItem style={{ flex: '1 1 520px', minWidth: '320px' }}>
					<ResourceDataView<Job, JobListParams>
						resource={resolvedResource}
						config={jobDataViewsConfig}
						emptyState={emptyState}
					/>
				</FlexItem>
			</Flex>
		</div>
	);
}
