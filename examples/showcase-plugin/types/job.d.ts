/**\n * Auto-generated TypeScript types from job.schema.json\n * DO NOT EDIT MANUALLY - regenerate with: pnpm types:generate\n */

/**
 * A job posting entity in the careers showcase plugin
 */
export interface Job {
	/**
	 * Unique identifier for the job posting (WordPress post ID)
	 */
	id: number;
	/**
	 * Job posting title
	 */
	title: string;
	/**
	 * URL-friendly slug for the job posting
	 */
	slug?: string;
	/**
	 * Publication status of the job posting
	 */
	status: 'draft' | 'publish' | 'closed';
	/**
	 * Full job description (HTML content)
	 */
	description?: string;
	/**
	 * Department or team for this position
	 */
	department?: string;
	/**
	 * Geographic location for the position
	 */
	location?: string;
	/**
	 * Experience level required
	 */
	seniority?: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal';
	/**
	 * Type of employment
	 */
	job_type?:
		| 'Full-time'
		| 'Part-time'
		| 'Contract'
		| 'Internship'
		| 'Temporary';
	/**
	 * Remote work policy
	 */
	remote_policy?: 'on-site' | 'remote' | 'hybrid';
	/**
	 * Minimum salary range (annual, in cents to avoid floating point)
	 */
	salary_min?: number;
	/**
	 * Maximum salary range (annual, in cents to avoid floating point)
	 */
	salary_max?: number;
	/**
	 * Application deadline (ISO 8601 date string)
	 */
	apply_deadline?: string;
	/**
	 * Timestamp when the job was created (ISO 8601)
	 */
	created_at: string;
	/**
	 * Timestamp when the job was last updated (ISO 8601)
	 */
	updated_at?: string;
}
