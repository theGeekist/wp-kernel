import type { Reporter, SerializedError } from '@geekist/wp-kernel';

export interface ApplySummary {
	created: number;
	updated: number;
	skipped: number;
}

export interface ApplyFileRecord {
	source: string;
	target: string;
	status: keyof ApplySummary;
	backup?: string | null;
	forced?: boolean;
}

export interface ApplyResult {
	summary: ApplySummary;
	records: ApplyFileRecord[];
}

export interface ApplyLogSection {
	summary: ApplySummary;
	files: ApplyFileRecord[];
}

export interface ApplyFlags {
	yes: boolean;
	backup: boolean;
	force: boolean;
}

export interface ApplyOptions {
	reporter: Reporter;
	sourceDir: string;
	targetDir: string;
	force: boolean;
	backup: boolean;
}

export interface ApplyLogEntry {
	timestamp: string;
	flags: ApplyFlags;
	result: 'success' | 'failure';
	summary?: ApplySummary;
	files?: ApplyFileRecord[];
	error?: SerializedError | Record<string, unknown>;
	php?: ApplyLogSection;
	blocks?: ApplyLogSection;
}
