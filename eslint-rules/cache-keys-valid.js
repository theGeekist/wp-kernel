import {
	createWPKernelConfigEvaluator,
	getObjectProperty,
	getResourcesFromConfig,
} from './utils/kernel-config-evaluator.js';

/* eslint-disable import/no-default-export */

const DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/docs/internal/cli-migration-phases.md#authoring-safety-lint-rules';

/**
 * Functions permitted in cache key expressions.
 * - normalizeKeyValue: Framework utility for consistent value normalization
 * - String, Number, Boolean: Built-in constructors for safe type coercion to primitives
 * Other function calls are flagged as they may produce non-serializable or unpredictable cache keys.
 */
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

function getSourceText(sourceCode, node) {
	return node ? sourceCode.getText(node) : '';
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

/**
 * @typedef {Object} CacheKeyValidationContext
 * @property {import('eslint').Rule.RuleContext} context         - ESLint rule context for reporting errors
 * @property {string}                            resourceName    - Name of the resource being validated (e.g., 'Job', 'Application')
 * @property {string}                            operation       - Operation name being validated (e.g., 'list', 'get', 'update')
 * @property {import('estree').Node}             fnNode          - AST node representing the cache key function expression
 * @property {Set<string>}                       queryParamNames - Set of declared query parameter names from resources[name].queryParams
 */

/**
 * Validates a cache key function for a resource operation.
 * Ensures the function returns an array literal containing only primitives, query parameter accesses,
 * or safe coercion calls (String/Number/Boolean/normalizeKeyValue).
 * All query parameters referenced must be declared in the resource's queryParams.
 *
 * @param {CacheKeyValidationContext} params - Validation context
 */
function validateCacheKeyFunction({
	context,
	resourceName,
	operation,
	fnNode,
	queryParamNames,
	sourceCode,
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
			sourceCode,
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
	// Framework constraint: Cache keys must be array literals for React Query serialization.
	// The framework passes cache keys to React Query's queryKey, which compares them across renders
	// using deep equality. Non-array returns (objects, strings, computed values) can't be serialized
	// deterministically, causing cache invalidation failures and stale data issues.
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
	sourceCode,
}) {
	const accesses = [];
	for (const element of arrayNode.elements) {
		if (!element) {
			continue;
		}

		accesses.length = 0;
		const ok = analyzeExpression(element, aliases, accesses);
		if (!ok) {
			// Framework constraint: Cache key array elements must be primitives or safe coercions.
			// Objects/functions in cache keys can't serialize to stable strings. This causes React Query
			// to treat identical queries as different, leading to duplicate requests and cache misses.
			// Only allow: literals (42, "draft"), query param accesses (query.id), or coercions (String(query.id)).
			context.report({
				node: element,
				messageId: 'nonPrimitiveElement',
				data: {
					resource: resourceName,
					operation,
					expression: getSourceText(sourceCode, element),
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
	if (unknownParams.size === 0) {
		return;
	}

	for (const [param, node] of unknownParams.entries()) {
		// Framework constraint: All query parameters used in cache keys must be declared in queryParams.
		// The framework generates TypeScript types, validation, and REST endpoint bindings from queryParams.
		// Undeclared parameters won't be typed, validated at runtime, or passed to the PHP handler correctly.
		// This causes cache keys to reference undefined/null values, breaking cache invalidation logic.
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
				'Cache key "{{resource}}.{{operation}}" must return an array literal of primitives. ' +
				'The framework serializes cache keys for React Query to compare across renders. ' +
				'Non-array returns cannot be serialized deterministically. ' +
				'Fix: return [query.id, query.status] or return [String(query.id)]. ' +
				'See {{docUrl}}.',
			nonPrimitiveElement:
				'Cache key "{{resource}}.{{operation}}" contains non-primitive element "{{expression}}". ' +
				"Cache keys must serialize to stable strings for React Query's key comparison. " +
				'Objects, functions, and computed values produce unpredictable cache keys, causing stale data or cache misses. ' +
				'Fix: use only literals (42, "draft"), query parameter accesses (query.id), or safe coercions (String(query.id)). ' +
				'See {{docUrl}}.',
			unknownQueryParam:
				'Cache key "{{resource}}.{{operation}}" references unknown query parameter "{{param}}". ' +
				'The framework requires all query parameters used in cache keys to be declared in queryParams. ' +
				"Undeclared parameters won't be typed, validated, or passed correctly to the endpoint at runtime. " +
				'Fix: Add "{{param}}" to resources.{{resource}}.queryParams with its type (e.g., { {{param}}: { type: "string" } }). ' +
				'See {{docUrl}}.',
		},
		schema: [],
	},
	create(context) {
		const evaluator = createWPKernelConfigEvaluator(context);
		if (!evaluator.isWPKernelConfig) {
			return {};
		}

		const sourceCode = context.getSourceCode();

		return {
			Program() {
				const wpkConfig = evaluator.getWPKernelConfig();
				if (!wpkConfig) {
					return;
				}

				const resources = getResourcesFromConfig(wpkConfig);
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
							sourceCode,
						});
					}
				}
			},
		};
	},
};
