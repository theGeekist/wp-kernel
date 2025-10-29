import { ACTION_BUILDER_KIND, ACTION_FRAGMENT_KIND } from '../../actions/types';
import type { HelperDescriptor } from '../../types';

export type ActionLifecycleResponsibility =
	| 'options'
	| 'context'
	| 'lifecycle'
	| 'execution'
	| 'registry';

export interface CoreActionHelperDescriptor extends HelperDescriptor {
	readonly responsibility: ActionLifecycleResponsibility;
}

/**
 * Build the canonical helper descriptor catalogue for action orchestration.
 */
export function buildCoreActionHelperCatalog(): readonly CoreActionHelperDescriptor[] {
	return [
		{
			key: 'action.options.resolve',
			kind: ACTION_FRAGMENT_KIND,
			mode: 'extend',
			priority: 100,
			dependsOn: [],
			responsibility: 'options',
		},
		{
			key: 'action.context.assemble',
			kind: ACTION_FRAGMENT_KIND,
			mode: 'extend',
			priority: 90,
			dependsOn: ['action.options.resolve'],
			responsibility: 'context',
		},
		{
			key: 'action.lifecycle.initialize',
			kind: ACTION_FRAGMENT_KIND,
			mode: 'extend',
			priority: 80,
			dependsOn: ['action.context.assemble'],
			responsibility: 'lifecycle',
		},
		{
			key: 'action.execute.handler',
			kind: ACTION_BUILDER_KIND,
			mode: 'extend',
			priority: 70,
			dependsOn: ['action.lifecycle.initialize'],
			responsibility: 'execution',
		},
		{
			key: 'action.registry.record',
			kind: ACTION_BUILDER_KIND,
			mode: 'extend',
			priority: 60,
			dependsOn: ['action.execute.handler'],
			responsibility: 'registry',
		},
	];
}
