import { useEffect, useMemo, useState } from '@wordpress/element';
import { Flex, FlexItem, Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { job } from '../../resources';
import type { Job } from '../../../.generated/types/job';
import type { JobListParams } from '../../resources';
import { JobCreatePanel } from '../../views/jobs/JobCreatePanel';
import { JobFilters, type JobFiltersState } from '../../views/jobs/JobFilters';
import { JobListTable } from '../../views/jobs/JobListTable';
import { CreateJob, type CreateJobInput } from '../../actions/jobs/CreateJob';
import { ShowcaseActionError } from '../../errors/ShowcaseActionError';

type DebuggableWindow = Window &
	typeof globalThis & {
		wp?: {
			data?: {
				select: (storeKey: string) => unknown;
			};
		};
		__wpkKernelDebug?: unknown;
		__wpkKernelSelectors?: unknown;
	};

const defaultFilters: JobFiltersState = {
	search: '',
	status: 'all',
};

const filterJobs = (jobs: Job[], filters: JobFiltersState): Job[] => {
	if (!filters.search.trim()) {
		return jobs;
	}

	const searchLower = filters.search.trim().toLowerCase();
	return jobs.filter((jobItem) => {
		const matchesStatus =
			filters.status === 'all' || jobItem.status === filters.status;

		if (!matchesStatus) {
			return false;
		}

		const haystacks = [
			jobItem.title,
			jobItem.department || '',
			jobItem.location || '',
		];
		return haystacks.some((value) =>
			value.toLowerCase().includes(searchLower)
		);
	});
};

/**
 * JobsList renders a lean admin experience for managing job postings.
 */
export function JobsList(): JSX.Element {
	const [filters, setFilters] = useState<JobFiltersState>(defaultFilters);
	const [feedback, setFeedback] = useState<{
		type: 'success' | 'error';
		message: string;
	} | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const query = useMemo<JobListParams | undefined>(
		() =>
			filters.status === 'all' ? undefined : { status: filters.status },
		[filters.status]
	);

	const listResult = job.useList?.(query);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const debugWindow = window as DebuggableWindow;

		if (!debugWindow.wp?.data) {
			return;
		}

		debugWindow.__wpkKernelSelectors = debugWindow.wp.data.select(
			job.storeKey
		);
	}, []);

	useEffect(() => {
		if (!listResult || typeof window === 'undefined') {
			return;
		}

		const debugWindow = window as DebuggableWindow;

		debugWindow.__wpkKernelDebug = {
			query,
			isLoading: listResult.isLoading,
			error: listResult.error,
			items: listResult.data?.items?.length ?? 0,
		};
	}, [listResult, query]);

	const visibleJobs = useMemo(() => {
		const jobs = listResult?.data?.items ?? [];
		return filterJobs(jobs, filters);
	}, [listResult?.data?.items, filters]);

	const handleCreate = async (input: CreateJobInput) => {
		console.log('[JobsList] handleCreate START', { input, isSubmitting });
		setFeedback(null);
		setIsSubmitting(true);
		console.log('[JobsList] isSubmitting set to TRUE');

		try {
			console.log('[JobsList] About to call CreateJob');
			await CreateJob(input);
			console.log('[JobsList] CreateJob SUCCESS - job created');

			setFeedback({
				type: 'success',
				message: __('Job created successfully.', 'wp-kernel-showcase'),
			});

			console.log('[JobsList] About to invalidate cache', { query });
			job.cache.invalidate.list();
			console.log('[JobsList] Cache invalidated');
			// Trigger refetch in background (don't await - let it run async)
			if (job.prefetchList) {
				job.prefetchList(query).catch((err) => {
					console.warn('[JobsList] Background prefetch failed:', err);
				});
				console.log('[JobsList] Started background prefetch');
			}
		} catch (error) {
			console.error('[JobsList] Error in handleCreate:', error);
			const wrapped = ShowcaseActionError.fromUnknown(error, {
				context: {
					actionName: 'Jobs.Create',
					resourceName: job.storeKey,
				},
			});

			setFeedback({
				type: 'error',
				message: wrapped.message,
			});
		} finally {
			console.log(
				'[JobsList] FINALLY block - setting isSubmitting to FALSE'
			);
			setIsSubmitting(false);
			console.log('[JobsList] handleCreate END', { isSubmitting });
		}
	};

	return (
		<div className="jobs-admin" data-testid="jobs-admin-root">
			<h1>{__('Careers showcase', 'wp-kernel-showcase')}</h1>

			{listResult?.error && (
				<Notice
					status="error"
					isDismissible={false}
					data-testid="jobs-prefetch-error"
				>
					{listResult.error}
				</Notice>
			)}

			<Flex align="flex-start" wrap style={{ gap: '32px' }}>
				<FlexItem style={{ flex: '0 0 320px', minWidth: '280px' }}>
					<JobCreatePanel
						onSubmit={handleCreate}
						isSubmitting={isSubmitting}
						feedback={feedback}
					/>
				</FlexItem>
				<FlexItem style={{ flex: '1 1 480px', minWidth: '320px' }}>
					<JobFilters value={filters} onChange={setFilters} />
					<JobListTable
						jobs={visibleJobs}
						isLoading={Boolean(listResult?.isLoading)}
						errorMessage={listResult?.error ?? null}
					/>
				</FlexItem>
			</Flex>
		</div>
	);
}
