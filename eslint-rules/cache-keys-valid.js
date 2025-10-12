import {
	createKernelConfigEvaluator,
	getObjectProperty,
	getResourcesFromConfig,
} from './utils/kernel-config-evaluator.js';

/* eslint-disable import/no-default-export */

const DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/mvp-cli-spec.md#6-blocks-of-authoring-safety';

const ALLOWED_CALL_IDENTIFIERS = new Set([
	'normalizeKeyValue',
	'String',
	'Number',
	'Boolean',
]);

function gatherParamAliases(fnNode) {
	const [firstParam] = fnNode.params;
	if (!firstParam || firstParam.type !== 'Identifier') {
		return { paramName: null, aliases: new Set() };
	}

	const aliases = new Set([firstParam.name]);

	if (fnNode.body.type !== 'BlockStatement') {
		return { paramName: firstParam.name, aliases };
	}

	for (const statement of fnNode.body.body) {
		if (statement.type !== 'VariableDeclaration') {
			continue;
		}

		for (const declarator of statement.declarations) {
			if (declarator.id.type !== 'Identifier' || !declarator.init) {
				continue;
			}

			if (initializerReferencesAlias(declarator.init, aliases)) {
				aliases.add(declarator.id.name);
			}
		}
	}

	return { paramName: firstParam.name, aliases };
}

const aliasVisitors = {
	Identifier(node, aliases) {
		return aliases.has(node.name);
	},
	LogicalExpression(node, aliases, visit) {
		return visit(node.left) || visit(node.right);
	},
	BinaryExpression(node, aliases, visit) {
		return visit(node.left) || visit(node.right);
	},
	ConditionalExpression(node, aliases, visit) {
		return (
			visit(node.test) || visit(node.consequent) || visit(node.alternate)
		);
	},
	AssignmentExpression(node, aliases, visit) {
		return visit(node.left) || visit(node.right);
	},
	CallExpression(node, aliases, visit) {
		if (visit(node.callee)) {
			return true;
		}

		return node.arguments.some((argument) => visit(argument));
	},
	MemberExpression(node, aliases, visit) {
		return visit(node.object);
	},
	OptionalMemberExpression(node, aliases, visit) {
		return visit(node.object);
	},
	ParenthesizedExpression(node, aliases, visit) {
		return visit(node.expression);
	},
	TSAsExpression(node, aliases, visit) {
		return visit(node.expression);
	},
	TSSatisfiesExpression(node, aliases, visit) {
		return visit(node.expression);
	},
	TSNonNullExpression(node, aliases, visit) {
		return visit(node.expression);
	},
	ChainExpression(node, aliases, visit) {
		return visit(node.expression);
	},
	UnaryExpression(node, aliases, visit) {
		return visit(node.argument);
	},
};

function initializerReferencesAlias(node, aliases) {
	const visit = (next) => initializerReferencesAlias(next, aliases);
	const visitor = aliasVisitors[node.type];
	if (!visitor) {
		return false;
	}

	return visitor(node, aliases, visit);
}

function findReturnArray(fnNode) {
	if (
		fnNode.type === 'ArrowFunctionExpression' &&
		fnNode.body.type !== 'BlockStatement'
	) {
		return analyzeConciseArrowBody(fnNode.body);
	}

	if (fnNode.body.type !== 'BlockStatement') {
		return {
			arrays: [],
			nonArrayReturn: true,
			offendingNode: fnNode.body,
		};
	}

	return analyzeReturnStatements(fnNode.body.body, fnNode);
}

function analyzeConciseArrowBody(body) {
	if (body.type === 'ArrayExpression') {
		return {
			arrays: [body],
			nonArrayReturn: false,
		};
	}

	return {
		arrays: [],
		nonArrayReturn: true,
		offendingNode: body,
	};
}

function analyzeReturnStatements(statements, fallbackNode) {
	const arrays = [];
	let nonArrayNode = null;
	let hasReturn = false;

	for (const statement of statements) {
		if (statement.type !== 'ReturnStatement') {
			continue;
		}

		hasReturn = true;

		if (statement.argument?.type === 'ArrayExpression') {
			arrays.push(statement.argument);
			continue;
		}

		nonArrayNode = statement.argument ?? statement;
		break;
	}

	if (arrays.length === 0) {
		return {
			arrays: [],
			nonArrayReturn: true,
			offendingNode: nonArrayNode ?? fallbackNode,
			hasReturn,
		};
	}

	return {
		arrays,
		nonArrayReturn: false,
	};
}

function getSourceText(context, node) {
	return node ? context.getSourceCode().getText(node) : '';
}

const expressionAnalyzers = {
	Literal() {
		return true;
	},
	Identifier() {
		return true;
	},
	MemberExpression(node, aliases, accesses, visit) {
		return analyzeMemberExpression(node, aliases, accesses, visit);
	},
	OptionalMemberExpression(node, aliases, accesses, visit) {
		return analyzeMemberExpression(node, aliases, accesses, visit);
	},
	CallExpression(node, aliases, accesses, visit) {
		if (
			node.callee.type === 'Identifier' &&
			ALLOWED_CALL_IDENTIFIERS.has(node.callee.name)
		) {
			return node.arguments.every((argument) => visit(argument));
		}

		return false;
	},
	TemplateLiteral(node, aliases, accesses, visit) {
		return node.expressions.every((expr) => visit(expr));
	},
	BinaryExpression(node, aliases, accesses, visit) {
		return visit(node.left) && visit(node.right);
	},
	LogicalExpression(node, aliases, accesses, visit) {
		return visit(node.left) && visit(node.right);
	},
	ConditionalExpression(node, aliases, accesses, visit) {
		return (
			visit(node.test) && visit(node.consequent) && visit(node.alternate)
		);
	},
	UnaryExpression(node, aliases, accesses, visit) {
		return visit(node.argument);
	},
	ChainExpression(node, aliases, accesses, visit) {
		return visit(node.expression);
	},
	ParenthesizedExpression(node, aliases, accesses, visit) {
		return visit(node.expression);
	},
	TSAsExpression(node, aliases, accesses, visit) {
		return visit(node.expression);
	},
	TSSatisfiesExpression(node, aliases, accesses, visit) {
		return visit(node.expression);
	},
	TSNonNullExpression(node, aliases, accesses, visit) {
		return visit(node.expression);
	},
};

function analyzeExpression(node, aliases, accesses) {
	const visit = (next) => analyzeExpression(next, aliases, accesses);
	const analyzer = expressionAnalyzers[node.type];
	if (!analyzer) {
		return false;
	}

	return analyzer(node, aliases, accesses, visit);
}

function analyzeMemberExpression(node, aliases, accesses, visit) {
	const base = resolveBaseIdentifier(node.object);
	if (base && aliases.has(base.name)) {
		const propName = getMemberPropertyName(node);
		if (propName) {
			accesses.push({ name: propName, node: node.property ?? node });
		}
	}

	if (node.computed && node.property) {
		return visit(node.property);
	}

	return visit(node.object);
}

function resolveBaseIdentifier(node) {
	if (node.type === 'Identifier') {
		return node;
	}

	if (
		node.type === 'MemberExpression' ||
		node.type === 'OptionalMemberExpression'
	) {
		return resolveBaseIdentifier(node.object);
	}

	if (node.type === 'ChainExpression') {
		return resolveBaseIdentifier(node.expression);
	}

	if (node.type === 'TSNonNullExpression' || node.type === 'TSAsExpression') {
		return resolveBaseIdentifier(node.expression);
	}

	return null;
}

function getMemberPropertyName(node) {
	if ('property' in node && node.property) {
		if (!node.computed && node.property.type === 'Identifier') {
			return node.property.name;
		}

		if (
			node.property.type === 'Literal' &&
			typeof node.property.value === 'string'
		) {
			return node.property.value;
		}
	}

	return null;
}

function validateCacheKeyFunction({
	context,
	resourceName,
	operation,
	fnNode,
	queryParamNames,
}) {
	const { aliases } = gatherParamAliases(fnNode);
	const { arrays, nonArrayReturn, offendingNode } = findReturnArray(fnNode);

	if (nonArrayReturn) {
		reportNonArrayReturn({
			context,
			resourceName,
			operation,
			fnNode,
			offendingNode,
		});
		return;
	}

	const unknownParams = new Map();

	for (const arrayNode of arrays) {
		analyzeArrayElements({
			arrayNode,
			aliases,
			context,
			operation,
			resourceName,
			queryParamNames,
			unknownParams,
		});
	}

	reportUnknownParams({
		context,
		operation,
		resourceName,
		unknownParams,
	});
}

function reportNonArrayReturn({
	context,
	resourceName,
	operation,
	fnNode,
	offendingNode,
}) {
	context.report({
		node: offendingNode ?? fnNode,
		messageId: 'nonArrayReturn',
		data: {
			resource: resourceName,
			operation,
			docUrl: DOC_URL,
		},
	});
}

function analyzeArrayElements({
	arrayNode,
	aliases,
	context,
	operation,
	resourceName,
	queryParamNames,
	unknownParams,
}) {
	for (const element of arrayNode.elements) {
		if (!element) {
			continue;
		}

		const accesses = [];
		const ok = analyzeExpression(element, aliases, accesses);
		if (!ok) {
			context.report({
				node: element,
				messageId: 'nonPrimitiveElement',
				data: {
					resource: resourceName,
					operation,
					expression: getSourceText(context, element),
					docUrl: DOC_URL,
				},
			});
			continue;
		}

		recordUnknownAccesses({
			accesses,
			queryParamNames,
			unknownParams,
		});
	}
}

function recordUnknownAccesses({ accesses, queryParamNames, unknownParams }) {
	for (const access of accesses) {
		if (
			!queryParamNames.has(access.name) &&
			!unknownParams.has(access.name)
		) {
			unknownParams.set(access.name, access.node);
		}
	}
}

function reportUnknownParams({
	context,
	resourceName,
	operation,
	unknownParams,
}) {
	for (const [param, node] of unknownParams.entries()) {
		context.report({
			node,
			messageId: 'unknownQueryParam',
			data: {
				resource: resourceName,
				operation,
				param,
				docUrl: DOC_URL,
			},
		});
	}
}

function collectCacheKeyFunctions(resource) {
	const cacheKeysProperty = getObjectProperty(resource, 'cacheKeys');
	if (!cacheKeysProperty || cacheKeysProperty.value.kind !== 'object') {
		return [];
	}

	const entries = [];
	for (const [
		key,
		property,
	] of cacheKeysProperty.value.properties.entries()) {
		if (property.value.kind === 'function') {
			entries.push({ key, property });
		}
	}

	return entries;
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Ensures cache key helpers return primitive arrays and only reference declared query parameters.',
			recommended: false,
			url: DOC_URL,
		},
		messages: {
			nonArrayReturn:
				'Cache key "{{resource}}.{{operation}}" must return an array literal. See {{docUrl}}.',
			nonPrimitiveElement:
				'Cache key "{{resource}}.{{operation}}" contains non-primitive element "{{expression}}". Only literals or parameter accessors are allowed. See {{docUrl}}.',
			unknownQueryParam:
				'Cache key "{{resource}}.{{operation}}" references unknown query parameter "{{param}}". Define it under queryParams to keep cache keys deterministic. See {{docUrl}}.',
		},
		schema: [],
	},
	create(context) {
		const evaluator = createKernelConfigEvaluator(context);
		if (!evaluator.isKernelConfig) {
			return {};
		}

		return {
			Program() {
				const kernelConfig = evaluator.getKernelConfig();
				if (!kernelConfig) {
					return;
				}

				const resources = getResourcesFromConfig(kernelConfig);
				for (const resource of resources) {
					if (!resource.value || resource.value.kind !== 'object') {
						continue;
					}

					const queryParams = getObjectProperty(
						resource.value,
						'queryParams'
					);
					const queryParamNames = new Set();
					if (queryParams?.value.kind === 'object') {
						for (const key of queryParams.value.properties.keys()) {
							queryParamNames.add(key);
						}
					}

					const cacheKeyFunctions = collectCacheKeyFunctions(
						resource.value
					);
					for (const entry of cacheKeyFunctions) {
						validateCacheKeyFunction({
							context,
							resourceName: resource.name,
							operation: entry.key,
							fnNode: entry.property.value.node,
							queryParamNames,
						});
					}
				}
			},
		};
	},
};
