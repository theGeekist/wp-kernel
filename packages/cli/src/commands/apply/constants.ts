import path from 'node:path';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';

export const PATCH_MANIFEST_PATH = path.posix.join(
	'.wpk',
	'apply',
	'manifest.json'
);

export const APPLY_LOG_PATH = '.wpk-apply.log';

export function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.apply`;
}
