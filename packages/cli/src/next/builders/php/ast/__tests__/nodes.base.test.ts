import {
	createAttribute,
	createAttributeGroup,
	createName,
	createNode,
	mergeNodeAttributes,
} from '../nodes';

const TEST_NODE_TYPE = 'Custom_Test_Node';

interface TestNode {
	readonly nodeType: typeof TEST_NODE_TYPE;
	readonly attributes: Record<string, unknown>;
	readonly value: string;
}

function createTestNode(
	value: string,
	attributes?: Record<string, unknown>
): TestNode {
	return createNode<TestNode>(TEST_NODE_TYPE, { value }, attributes);
}

describe('PHP AST node helpers', () => {
	it('reuses the shared empty attributes bag when none are provided', () => {
		const node = createTestNode('example');

		expect(node.attributes).toEqual({});
		expect(Object.isFrozen(node.attributes)).toBe(true);

		const reused = createTestNode('next', node.attributes);
		expect(reused.attributes).toBe(node.attributes);
	});

	it('normalises empty attribute objects to the shared bag', () => {
		const provided: Record<string, unknown> = {};
		const node = createTestNode('example', provided);

		expect(node.attributes).toEqual({});
		expect(node.attributes).not.toBe(provided);
	});

	it('defensively clones populated attribute objects', () => {
		const attrs = { startLine: 42 };
		const node = createTestNode('example', attrs);

		expect(node.attributes).toEqual(attrs);
		expect(node.attributes).not.toBe(attrs);

		attrs.startLine = 99;
		expect(node.attributes).toEqual({ startLine: 42 });
	});

	it('merges new attribute data without mutating the source node', () => {
		const node = createTestNode('value', { startLine: 1 });
		const merged = mergeNodeAttributes(node, { endLine: 2 });

		expect(merged).not.toBe(node);
		expect(merged.attributes).toEqual({ startLine: 1, endLine: 2 });
		expect(node.attributes).toEqual({ startLine: 1 });
	});

	it('returns the original node when merging with identical attributes', () => {
		const node = createTestNode('value', { startLine: 1 });

		expect(mergeNodeAttributes(node, undefined)).toBe(node);
		expect(mergeNodeAttributes(node, node.attributes)).toBe(node);

		const emptyNode = createTestNode('empty');
		expect(mergeNodeAttributes(emptyNode, {})).toBe(emptyNode);
	});

	it('creates attribute nodes through the dedicated helpers', () => {
		const attribute = createAttribute(createName(['Example']), []);

		const group = createAttributeGroup([attribute]);

		expect(group).toMatchObject({
			nodeType: 'AttributeGroup',
			attrs: [attribute],
		});
	});
});
