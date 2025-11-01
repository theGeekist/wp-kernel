export function computeTotalPages(totalItems: number, perPage: number): number {
	if (!perPage || perPage <= 0) {
		return 1;
	}

	return Math.max(1, Math.ceil(totalItems / perPage));
}
