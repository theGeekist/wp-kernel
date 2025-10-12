import path from 'path';

const KERNEL_CONFIG_FILENAME = 'kernel.config.ts';

function isKernelConfigFile(filename) {
	if (!filename) {
		return false;
	}

	return path.basename(filename) === KERNEL_CONFIG_FILENAME;
}

function createProperty(key, value, propertyNode, keyNode) {
	return {
		key,
		value,
		propertyNode,
		keyNode,
	};
}

function getLiteralFromTemplate(node) {
	if (node.expressions.length > 0) {
		return null;
	}

	const cooked = node.quasis
		.map((quasi) => quasi.value.cooked ?? '')
		.join('');
	return cooked;
}

function getStaticPropertyName(node) {
	if (!node) {
		return null;
	}

	switch (node.type) {
		case 'Identifier':
			return node.name;
		case 'Literal':
			if (typeof node.value === 'string') {
				return node.value;
			}
			return null;
		case 'TemplateLiteral':
			return getLiteralFromTemplate(node);
		default:
			return null;
	}
}

function isObjectLike(result) {
	return result?.kind === 'object';
}

function isArrayLike(result) {
	return result?.kind === 'array';
}

function isPrimitive(result) {
	return result?.kind === 'primitive';
}

function unwrapToExpression(node) {
	switch (node.type) {
		case 'ParenthesizedExpression':
			return unwrapToExpression(node.expression);
		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSNonNullExpression':
			return unwrapToExpression(node.expression);
		default:
			return node;
	}
}

export function createKernelConfigEvaluator(context) {
	const sourceCode = context.getSourceCode();
	const program = sourceCode.ast;
	const filename = context.getFilename();

	if (!isKernelConfigFile(filename)) {
		return {
			isKernelConfig: false,
		};
	}

	const declarations = new Map();
	const identifierCache = new Map();
	const evaluating = new Set();
	const nodeCache = new Map();

	for (const statement of program.body) {
		if (statement.type === 'VariableDeclaration') {
			registerDeclaration(statement);
			continue;
		}

		if (
			statement.type === 'ExportNamedDeclaration' &&
			statement.declaration &&
			statement.declaration.type === 'VariableDeclaration'
		) {
			registerDeclaration(statement.declaration);
		}
	}

	function registerDeclaration(node) {
		for (const declarator of node.declarations) {
			if (declarator.id.type === 'Identifier' && declarator.init) {
				declarations.set(declarator.id.name, declarator);
			}
		}
	}

	const nodeEvaluators = {
		Literal: (node) => ({ kind: 'primitive', value: node.value, node }),
		TemplateLiteral: (node) => evaluateTemplateLiteralNode(node),
		ObjectExpression: (node) => evaluateObjectExpression(node),
		ArrayExpression: (node) => evaluateArrayExpression(node),
		Identifier: (node) => evaluateIdentifier(node.name, node),
		ArrowFunctionExpression: (node) => ({ kind: 'function', node }),
		FunctionExpression: (node) => ({ kind: 'function', node }),
		UnaryExpression: (node) => evaluateUnaryExpression(node),
		ParenthesizedExpression: (node) => evaluateNode(node.expression),
		TSAsExpression: (node) => evaluateNode(node.expression),
		TSSatisfiesExpression: (node) => evaluateNode(node.expression),
		TSNonNullExpression: (node) => evaluateNode(node.expression),
	};

	function evaluateNode(node) {
		if (!node) {
			return { kind: 'unknown', node };
		}

		const cached = nodeCache.get(node);
		if (cached) {
			return cached;
		}

		const evaluator = nodeEvaluators[node.type];
		const result = evaluator ? evaluator(node) : { kind: 'unknown', node };
		nodeCache.set(node, result);
		return result;
	}

	function evaluateIdentifier(name, referenceNode) {
		if (identifierCache.has(name)) {
			return identifierCache.get(name);
		}

		const declarator = declarations.get(name);
		if (!declarator?.init) {
			const fallbackNode = referenceNode ?? declarator?.id ?? program;
			return cacheUnknownIdentifier(name, fallbackNode);
		}

		if (evaluating.has(name)) {
			return { kind: 'unknown', node: declarator.init };
		}

		evaluating.add(name);
		const value = evaluateNode(declarator.init);
		evaluating.delete(name);
		identifierCache.set(name, value);
		return value;
	}

	function evaluateTemplateLiteralNode(node) {
		const literal = getLiteralFromTemplate(node);
		if (literal === null) {
			return { kind: 'unknown', node };
		}

		return { kind: 'primitive', value: literal, node };
	}

	function evaluateUnaryExpression(node) {
		if (node.operator !== '-' && node.operator !== '+') {
			return { kind: 'unknown', node };
		}

		const argument = evaluateNode(node.argument);
		if (
			argument.kind === 'primitive' &&
			typeof argument.value === 'number'
		) {
			const value =
				node.operator === '-' ? -argument.value : argument.value;
			return { kind: 'primitive', value, node };
		}

		return { kind: 'unknown', node };
	}

	function cacheUnknownIdentifier(name, fallbackNode) {
		const unknown = { kind: 'unknown', node: fallbackNode };
		identifierCache.set(name, unknown);
		return unknown;
	}

	function evaluateObjectExpression(node) {
		const properties = new Map();

		for (const property of node.properties) {
			if (property.type === 'SpreadElement') {
				if (!mergeSpreadProperty(properties, property)) {
					return { kind: 'unknown', node };
				}

				continue;
			}

			if (!isInitialProperty(property)) {
				if (property.type !== 'Property') {
					return { kind: 'unknown', node };
				}

				continue;
			}

			const keyName = getStaticPropertyName(property.key);
			if (!keyName) {
				return { kind: 'unknown', node };
			}

			const value = evaluateNode(property.value);
			properties.set(
				keyName,
				createProperty(keyName, value, property, property.key)
			);
		}

		return {
			kind: 'object',
			node,
			properties,
		};
	}

	function mergeSpreadProperty(properties, property) {
		const argument = evaluateNode(property.argument);
		if (!isObjectLike(argument)) {
			return false;
		}

		for (const [key, existing] of argument.properties.entries()) {
			properties.set(
				key,
				createProperty(
					key,
					existing.value,
					existing.propertyNode,
					existing.keyNode
				)
			);
		}

		return true;
	}

	function isInitialProperty(property) {
		if (property.type !== 'Property') {
			return false;
		}

		return property.kind === 'init';
	}

	function evaluateArrayExpression(node) {
		const elements = [];

		for (const element of node.elements) {
			if (!element) {
				elements.push({
					kind: 'primitive',
					value: undefined,
					node: element,
				});
				continue;
			}

			if (element.type === 'SpreadElement') {
				const argument = evaluateNode(element.argument);
				if (!isArrayLike(argument)) {
					return { kind: 'unknown', node };
				}

				elements.push(...argument.elements);
				continue;
			}

			elements.push(evaluateNode(element));
		}

		return {
			kind: 'array',
			node,
			elements,
		};
	}

	function getKernelConfig() {
		const kernelConfig = evaluateIdentifier('kernelConfig');
		if (!isObjectLike(kernelConfig)) {
			return null;
		}

		return kernelConfig;
	}

	return {
		isKernelConfig: true,
		evaluateNode,
		getKernelConfig,
		evaluateIdentifier,
	};
}

export function getObjectProperty(evaluatedObject, propertyName) {
	if (!isObjectLike(evaluatedObject)) {
		return null;
	}

	return evaluatedObject.properties.get(propertyName) ?? null;
}

export function getStringValue(evaluatedValue) {
	if (
		isPrimitive(evaluatedValue) &&
		typeof evaluatedValue.value === 'string'
	) {
		return evaluatedValue.value;
	}

	return null;
}

export function getResourcesFromConfig(kernelConfig) {
	const resourcesProperty = getObjectProperty(kernelConfig, 'resources');
	if (!resourcesProperty || !isObjectLike(resourcesProperty.value)) {
		return [];
	}

	const resources = [];
	for (const [
		key,
		property,
	] of resourcesProperty.value.properties.entries()) {
		resources.push({
			name: key,
			property,
			value: property.value,
		});
	}

	return resources;
}

export function unwrapExpression(node) {
	return unwrapToExpression(node);
}

export function getStringProperties(evaluatedObject) {
	if (!isObjectLike(evaluatedObject)) {
		return new Map();
	}

	const entries = new Map();
	for (const [key, property] of evaluatedObject.properties.entries()) {
		const stringValue = getStringValue(property.value);
		if (stringValue !== null) {
			entries.set(key, {
				value: stringValue,
				property,
			});
		}
	}

	return entries;
}

export const evaluatorUtils = {
	isObjectLike,
	isArrayLike,
	isPrimitive,
};
