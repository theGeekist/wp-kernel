import { createHelper } from '../../runtime';
import { printCapabilityModule } from './capability';

export function createTsCapabilityBuilder() {
	return createHelper({
		key: 'ts-capability-builder',
		kind: 'builder',
		async apply({ input, output, reporter }) {
			if (!input.ir || !input.ir.capabilityMap.definitions.length) {
				reporter.debug(
					'Skipping TypeScript capability module generation (no capabilities defined).'
				);
				return;
			}

			const contents = printCapabilityModule(input.ir);
			await output.queueWrite({
				file: '.generated/js/capabilities.ts',
				contents,
			});
		},
	});
}
