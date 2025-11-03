import { createHelper } from '../../runtime';
import type { IRDiagnostic, IRWarning } from '../publicTypes';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

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

function toCapabilityDiagnostic(warning: IRWarning): IRDiagnostic {
	return {
		key: `${DIAGNOSTICS_FRAGMENT_KEY}:capability-map:${warning.code}`,
		message: warning.message,
		severity: 'warn',
		context: {
			source: 'capability-map',
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
		dependsOn: ['ir.resources.core', 'ir.capability-map.core'],
		async apply({ input, output }: IrFragmentApplyOptions) {
			const diagnostics: IRDiagnostic[] = [];

			for (const resource of input.draft.resources) {
				for (const warning of resource.warnings) {
					diagnostics.push(
						toResourceDiagnostic(resource.name, warning)
					);
				}
			}

			if (input.draft.capabilityMap) {
				for (const warning of input.draft.capabilityMap.warnings) {
					diagnostics.push(toCapabilityDiagnostic(warning));
				}
			}

			output.assign({ diagnostics: sortDiagnostics(diagnostics) });
		},
	});
}
