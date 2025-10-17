import { createHelper } from '../../helper';
import type { IRDiagnostic, IRWarning } from '../../../ir/types';
import type { IrFragment } from '../types';

const DIAGNOSTICS_FRAGMENT_KEY = 'ir.diagnostics.core';

function toResourceDiagnostic(
	resourceName: string,
	warning: IRWarning
): IRDiagnostic {
	return {
		key: `${DIAGNOSTICS_FRAGMENT_KEY}:resource:${resourceName}:${warning.code}`,
		message: warning.message,
		severity: 'warn',
		context: {
			source: 'resource',
			resource: resourceName,
			code: warning.code,
			...(warning.context ?? {}),
		},
	};
}

function toPolicyDiagnostic(warning: IRWarning): IRDiagnostic {
	return {
		key: `${DIAGNOSTICS_FRAGMENT_KEY}:policy-map:${warning.code}`,
		message: warning.message,
		severity: 'warn',
		context: {
			source: 'policy-map',
			code: warning.code,
			...(warning.context ?? {}),
		},
	};
}

function sortDiagnostics(values: IRDiagnostic[]): IRDiagnostic[] {
	return values.sort((a, b) => a.key.localeCompare(b.key));
}

export function createDiagnosticsFragment(): IrFragment {
	return createHelper({
		key: DIAGNOSTICS_FRAGMENT_KEY,
		kind: 'fragment',
		dependsOn: ['ir.resources.core', 'ir.policy-map.core'],
		async apply({ input, output }) {
			const diagnostics: IRDiagnostic[] = [];

			for (const resource of input.draft.resources) {
				for (const warning of resource.warnings) {
					diagnostics.push(
						toResourceDiagnostic(resource.name, warning)
					);
				}
			}

			if (input.draft.policyMap) {
				for (const warning of input.draft.policyMap.warnings) {
					diagnostics.push(toPolicyDiagnostic(warning));
				}
			}

			output.assign({ diagnostics: sortDiagnostics(diagnostics) });
		},
	});
}
