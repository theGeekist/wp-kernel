import type {
	BlockManifestMetadata,
	BlockManifestValidationError,
	BlockRegistrarMetadata,
} from '../../types';

export function buildBlockManifestMetadata(options?: {
	readonly validationErrors?: readonly BlockManifestValidationError[];
}): BlockManifestMetadata {
	const errors = options?.validationErrors ?? [];

	if (errors.length === 0) {
		return { kind: 'block-manifest' };
	}

	return {
		kind: 'block-manifest',
		validation: {
			errors: [...errors],
		},
	};
}

export function buildBlockRegistrarMetadata(): BlockRegistrarMetadata {
	return { kind: 'block-registrar' };
}
