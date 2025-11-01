import { useState } from 'react';

export function useSelection() {
	const [selection, setSelection] = useState<string[]>([]);

	return {
		selection,
		handleSelectionChange: setSelection,
	};
}
