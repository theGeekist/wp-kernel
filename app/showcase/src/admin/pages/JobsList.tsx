/**
 * Jobs List Admin Page
 *
 * Demonstrates WP Kernel framework usage in an admin context:
 * - Reading from the auto-generated @wordpress/data store
 * - Using the typed resource client for writes
 * - Handling loading/empty/error states
 * - Using @wordpress/components for UI
 *
 * This is a preview of the pattern that Sprint 5's mountAdmin() will formalize.
 */

import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import {
	Button,
	Card,
	CardBody,
	CardHeader,
	Spinner,
	TextControl,
	SelectControl,
	Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { job } from '../../resources/job';
import type { Job } from '../../../types/job.js';

/**
 * Jobs List Component
 *
 * Reads from the job store and provides a form to create new jobs.
 */
export function JobsList(): JSX.Element {
	// State for create form
	const [isCreating, setIsCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);
	const [createSuccess, setCreateSuccess] = useState(false);
	const [formData, setFormData] = useState<{
		title: string;
		department: string;
		location: string;
		status: 'draft' | 'publish' | 'closed';
	}>({
		title: '',
		department: '',
		location: '',
		status: 'draft',
	});

	// Read from store using the auto-generated selectors
	const { jobsResponse, isLoading, error } = useSelect((select) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const store = select(job.storeKey) as any;
		return {
			jobsResponse: store.getList(),
			isLoading: store.isResolving('getList', []),
			error: store.getResolutionError('getList', []),
		};
	}, []);

	// Extract items array from the response
	const jobs = jobsResponse?.items || [];

	/**
	 * Handle form submission
	 *
	 * Uses the typed resource client directly.
	 * Sprint 3 will replace this with an Action (CreateJob).
	 * @param e - Form submit event
	 */
	const handleSubmit = async (
		e: React.FormEvent<HTMLFormElement>
	): Promise<void> => {
		e.preventDefault();
		setIsCreating(true);
		setCreateError(null);
		setCreateSuccess(false);

		try {
			// Use the typed client from the resource
			// The resource object extends ResourceClient, so methods are direct
			await job.create?.({
				title: formData.title,
				department: formData.department,
				location: formData.location,
				status: formData.status,
			});

			// Success - reset form
			setFormData({
				title: '',
				department: '',
				location: '',
				status: 'draft',
			});
			setCreateSuccess(true);

			// Auto-dismiss success message
			setTimeout(() => setCreateSuccess(false), 3000);
		} catch (err) {
			setCreateError(
				err instanceof Error
					? err.message
					: __('Failed to create job', 'wp-kernel-showcase')
			);
		} finally {
			setIsCreating(false);
		}
	};

	/**
	 * Render loading state
	 */
	if (isLoading) {
		return (
			<div style={{ padding: '20px', textAlign: 'center' }}>
				<Spinner />
				<p>{__('Loading jobs…', 'wp-kernel-showcase')}</p>
			</div>
		);
	}

	/**
	 * Render error state
	 */
	if (error) {
		return (
			<div style={{ padding: '20px' }}>
				<Notice status="error" isDismissible={false}>
					{__('Error loading jobs:', 'wp-kernel-showcase')}{' '}
					{error instanceof Error ? error.message : String(error)}
				</Notice>
			</div>
		);
	}

	/**
	 * Render empty state
	 */
	if (!jobs || jobs.length === 0) {
		return (
			<div style={{ padding: '20px' }}>
				<Notice status="warning" isDismissible={false}>
					{__(
						'No jobs found. Create one below to get started.',
						'wp-kernel-showcase'
					)}
				</Notice>
				{renderCreateForm()}
			</div>
		);
	}

	/**
	 * Render jobs list
	 */
	return (
		<div style={{ padding: '20px' }}>
			<h1>{__('Jobs', 'wp-kernel-showcase')}</h1>

			{/* Success message */}
			{createSuccess && (
				<Notice status="success" isDismissible={false}>
					{__('Job created successfully!', 'wp-kernel-showcase')}
				</Notice>
			)}

			{/* Create form */}
			{renderCreateForm()}

			{/* Jobs list */}
			<Card style={{ marginTop: '20px' }}>
				<CardHeader>
					<h2>{__('All Jobs', 'wp-kernel-showcase')}</h2>
				</CardHeader>
				<CardBody>
					<table className="wp-list-table widefat fixed striped">
						<thead>
							<tr>
								<th>{__('ID', 'wp-kernel-showcase')}</th>
								<th>{__('Title', 'wp-kernel-showcase')}</th>
								<th>
									{__('Department', 'wp-kernel-showcase')}
								</th>
								<th>{__('Location', 'wp-kernel-showcase')}</th>
								<th>{__('Status', 'wp-kernel-showcase')}</th>
								<th>{__('Created', 'wp-kernel-showcase')}</th>
							</tr>
						</thead>
						<tbody>
							{jobs.map((jobItem: Job) => (
								<tr key={jobItem.id}>
									<td>{jobItem.id}</td>
									<td>
										<strong>{jobItem.title}</strong>
									</td>
									<td>{jobItem.department}</td>
									<td>{jobItem.location}</td>
									<td>
										<span
											className={`status-badge status-${jobItem.status}`}
											style={{
												padding: '2px 8px',
												borderRadius: '3px',
												fontSize: '12px',
												backgroundColor: (() => {
													if (
														jobItem.status ===
														'publish'
													) {
														return '#d1f0d1';
													}
													if (
														jobItem.status ===
														'draft'
													) {
														return '#f0f0f0';
													}
													return '#f0d1d1';
												})(),
											}}
										>
											{jobItem.status}
										</span>
									</td>
									<td>
										{new Date(
											jobItem.created_at
										).toLocaleDateString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</CardBody>
			</Card>
		</div>
	);

	/**
	 * Render create form (helper)
	 */
	function renderCreateForm() {
		return (
			<Card style={{ marginTop: '20px' }}>
				<CardHeader>
					<h2>{__('Create New Job', 'wp-kernel-showcase')}</h2>
				</CardHeader>
				<CardBody>
					{createError && (
						<Notice
							status="error"
							isDismissible
							onRemove={() => setCreateError(null)}
						>
							{createError}
						</Notice>
					)}

					<form onSubmit={handleSubmit}>
						<TextControl
							label={__('Job Title', 'wp-kernel-showcase')}
							value={formData.title}
							onChange={(title) =>
								setFormData({ ...formData, title })
							}
							required
							disabled={isCreating}
						/>
						<TextControl
							label={__('Department', 'wp-kernel-showcase')}
							value={formData.department}
							onChange={(department) =>
								setFormData({ ...formData, department })
							}
							required
							disabled={isCreating}
						/>
						<TextControl
							label={__('Location', 'wp-kernel-showcase')}
							value={formData.location}
							onChange={(location) =>
								setFormData({ ...formData, location })
							}
							required
							disabled={isCreating}
						/>
						<SelectControl
							label={__('Status', 'wp-kernel-showcase')}
							value={formData.status}
							options={[
								{
									label: __('Draft', 'wp-kernel-showcase'),
									value: 'draft',
								},
								{
									label: __(
										'Published',
										'wp-kernel-showcase'
									),
									value: 'publish',
								},
								{
									label: __('Closed', 'wp-kernel-showcase'),
									value: 'closed',
								},
							]}
							onChange={(status) =>
								setFormData({
									...formData,
									status:
										(status as
											| 'draft'
											| 'publish'
											| 'closed') || 'draft',
								})
							}
							disabled={isCreating}
						/>{' '}
						<Button
							type="submit"
							variant="primary"
							isBusy={isCreating}
							disabled={isCreating}
						>
							{isCreating
								? __('Creating…', 'wp-kernel-showcase')
								: __('Create Job', 'wp-kernel-showcase')}
						</Button>
					</form>
				</CardBody>
			</Card>
		);
	}
}
