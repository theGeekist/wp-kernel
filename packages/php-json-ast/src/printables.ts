export interface PhpPrintable<TNode> {
	readonly node: TNode;
	readonly lines: readonly string[];
}

export function createPrintable<TNode>(
	node: TNode,
	lines: readonly string[]
): PhpPrintable<TNode> {
	return {
		node,
		lines,
	};
}
