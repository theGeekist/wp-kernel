import type { ActionDefinedEvent } from '../../../events/bus';
import type { CorePipelineRegistryBridge } from '../../helpers/context';

export function createActionRegistryBridge(
	onRecord: (event: ActionDefinedEvent) => void
): CorePipelineRegistryBridge {
	let recorded = false;

	return {
		recordActionDefined(event) {
			if (recorded) {
				return;
			}

			onRecord(event);
			recorded = true;
		},
	};
}
