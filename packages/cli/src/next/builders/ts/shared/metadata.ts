export interface BlockRegistrarMetadata {
	readonly blockKey: string;
	readonly variableName: string;
	readonly manifestIdentifier: string;
	readonly settingsHelperIdentifier: string;
}

export function toPascalCase(value: string): string {
	return value
		.split(/[^a-zA-Z0-9]+/u)
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join('');
}

export function toCamelCase(value: string): string {
	const pascal = toPascalCase(value);
	if (pascal.length === 0) {
		return pascal;
	}
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function formatBlockVariableName(blockName: string): string {
	const segments = blockName
		.split(/[\/\-]/u)
		.map((segment) => segment.trim())
		.filter(Boolean);

	if (segments.length === 0) {
		return 'block';
	}

	return segments
		.map((segment, index) => {
			const lower = segment.toLowerCase();
			if (index === 0) {
				return lower;
			}
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join('');
}

export function buildBlockRegistrarMetadata(
	blockKey: string
): BlockRegistrarMetadata {
	const variableName = formatBlockVariableName(blockKey);

	return {
		blockKey,
		variableName,
		manifestIdentifier: `${variableName}Manifest`,
		settingsHelperIdentifier: 'createGeneratedBlockSettings',
	};
}
