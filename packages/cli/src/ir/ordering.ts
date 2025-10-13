import type { IRBlock, IRPolicyHint, IRResource, IRSchema } from './types';

export function sortSchemas(schemas: IRSchema[]): IRSchema[] {
	return schemas.slice().sort((a, b) => a.key.localeCompare(b.key));
}

export function sortResources(resources: IRResource[]): IRResource[] {
	return resources.slice().sort((a, b) => {
		const nameComparison = a.name.localeCompare(b.name);
		if (nameComparison !== 0) {
			return nameComparison;
		}

		return a.schemaKey.localeCompare(b.schemaKey);
	});
}

export function sortPolicies(policies: IRPolicyHint[]): IRPolicyHint[] {
	return policies.slice().sort((a, b) => a.key.localeCompare(b.key));
}

export function sortBlocks(blocks: IRBlock[]): IRBlock[] {
	return blocks.slice().sort((a, b) => a.key.localeCompare(b.key));
}
