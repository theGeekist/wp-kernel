export type IntermediateScalar = string | number | boolean | null;

export interface IntermediateAttributeMap {
	readonly [key: string]:
		| IntermediateScalar
		| IntermediateAttributeMap
		| IntermediateScalar[];
}

export interface IntermediateNode<
	Kind extends string = string,
	Metadata extends IntermediateAttributeMap = IntermediateAttributeMap,
> {
	readonly id: string;
	readonly kind: Kind;
	readonly attributes: Metadata;
}

export interface IntermediateEdge<
	Kind extends string = string,
	Metadata extends IntermediateAttributeMap = IntermediateAttributeMap,
> {
	readonly id: string;
	readonly from: string;
	readonly to: string;
	readonly kind: Kind;
	readonly attributes: Metadata;
}

export interface IntermediateRepresentation<
	NodeKind extends string = string,
	EdgeKind extends string = string,
	NodeMetadata extends IntermediateAttributeMap = IntermediateAttributeMap,
	EdgeMetadata extends IntermediateAttributeMap = IntermediateAttributeMap,
> {
	readonly nodes: readonly IntermediateNode<NodeKind, NodeMetadata>[];
	readonly edges: readonly IntermediateEdge<EdgeKind, EdgeMetadata>[];
	readonly metadata?: IntermediateAttributeMap;
}

export interface IntermediateRepresentationDraft<
	NodeKind extends string = string,
	EdgeKind extends string = string,
	NodeMetadata extends IntermediateAttributeMap = IntermediateAttributeMap,
	EdgeMetadata extends IntermediateAttributeMap = IntermediateAttributeMap,
> {
	readonly nodes?: IntermediateNode<NodeKind, NodeMetadata>[];
	readonly edges?: IntermediateEdge<EdgeKind, EdgeMetadata>[];
	readonly metadata?: IntermediateAttributeMap;
}

export function createIntermediateRepresentation<
	NodeKind extends string,
	EdgeKind extends string,
	NodeMetadata extends IntermediateAttributeMap,
	EdgeMetadata extends IntermediateAttributeMap,
>(
	draft: IntermediateRepresentationDraft<
		NodeKind,
		EdgeKind,
		NodeMetadata,
		EdgeMetadata
	>
): IntermediateRepresentation<NodeKind, EdgeKind, NodeMetadata, EdgeMetadata> {
	return {
		nodes: draft.nodes ?? [],
		edges: draft.edges ?? [],
		metadata: draft.metadata,
	};
}

export function isIntermediateNode(value: unknown): value is IntermediateNode {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const candidate = value as Partial<IntermediateNode>;
	return (
		typeof candidate.id === 'string' &&
		typeof candidate.kind === 'string' &&
		typeof candidate.attributes === 'object' &&
		candidate.attributes !== null
	);
}

export function isIntermediateEdge(value: unknown): value is IntermediateEdge {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const candidate = value as Partial<IntermediateEdge>;
	return (
		typeof candidate.id === 'string' &&
		typeof candidate.kind === 'string' &&
		typeof candidate.from === 'string' &&
		typeof candidate.to === 'string' &&
		typeof candidate.attributes === 'object' &&
		candidate.attributes !== null
	);
}
