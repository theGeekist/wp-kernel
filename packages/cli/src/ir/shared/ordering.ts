import type {
	IRBlock,
	IRCapabilityHint,
	IRResource,
	IRSchema,
} from '../publicTypes';

/**
 * Return a new array of schemas sorted by their key property.
 *
 * The input is not mutated; a stable ordered copy is returned for
 * deterministic downstream processing.
 *
 * @param    schemas - Array of IRSchema
 * @returns New sorted array of IRSchema
 * @category IR
 */
export function sortSchemas(schemas: IRSchema[]): IRSchema[] {
	return schemas.slice().sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Return a new array of resources deterministically sorted by name and
 * schema key. Used to produce stable output across runs.
 *
 * @param    resources - Array of IRResource
 * @returns New sorted array of IRResource
 * @category IR
 */
export function sortResources(resources: IRResource[]): IRResource[] {
	return resources.slice().sort((a, b) => {
		const nameComparison = a.name.localeCompare(b.name);
		if (nameComparison !== 0) {
			return nameComparison;
		}

		return a.schemaKey.localeCompare(b.schemaKey);
	});
}

/**
 * Return a new array of capability hints sorted by capability key.
 *
 * @param    capabilities - Array of IRCapabilityHint
 * @returns Sorted capability hints
 * @category IR
 */
export function sortCapabilities(
	capabilities: IRCapabilityHint[]
): IRCapabilityHint[] {
	return capabilities.slice().sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Return a new array of blocks sorted by block key.
 *
 * @param    blocks - Array of IRBlock
 * @returns Sorted blocks
 * @category IR
 */
export function sortBlocks(blocks: IRBlock[]): IRBlock[] {
	return blocks.slice().sort((a, b) => a.key.localeCompare(b.key));
}
