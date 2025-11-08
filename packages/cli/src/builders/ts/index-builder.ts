import { createHelper } from '../../runtime';

export function createTsIndexBuilder() {
	return createHelper({
		key: 'ts-index-builder',
		kind: 'builder',
		async apply({ input, output, reporter }) {
			if (!input.ir || !input.ir.capabilityMap.definitions.length) {
				reporter.debug(
					'Skipping TypeScript index module generation (no capabilities defined).'
				);
				return;
			}

			await output.queueWrite({
				file: '.generated/js/index.ts',
				contents: "export { capabilities } from './capabilities';\n",
			});
			await output.queueWrite({
				file: '.generated/js/index.d.ts',
				contents:
					"export { capabilities } from './capabilities';\nexport type { CapabilityConfig, CapabilityKey, CapabilityRuntime } from './capabilities';\n",
			});
		},
	});
}
