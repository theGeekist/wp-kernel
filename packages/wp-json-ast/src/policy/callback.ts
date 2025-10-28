import {
	buildArg,
	buildClassMethod,
	buildClosure,
	buildClosureUse,
	buildIdentifier,
	buildName,
	buildParam,
	buildReturn,
	buildStaticCall,
	buildVariable,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import {
	buildDocCommentAttributes,
	buildPolicyCallbackDocblock,
} from '../common/docblock';

export function buildCallbackMethod(): PhpStmtClassMethod {
	const docblock = buildPolicyCallbackDocblock();

	const closure = buildClosure({
		static: true,
		params: [
			buildParam(buildVariable('request'), {
				type: buildName(['WP_REST_Request']),
			}),
		],
		uses: [buildClosureUse(buildVariable('policy_key'))],
		stmts: [
			buildReturn(
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('enforce'),
					[
						buildArg(buildVariable('policy_key')),
						buildArg(buildVariable('request')),
					]
				)
			),
		],
	});

	return buildClassMethod(
		buildIdentifier('callback'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
			params: [
				buildParam(buildVariable('policy_key'), {
					type: buildIdentifier('string'),
				}),
			],
			returnType: buildIdentifier('callable'),
			stmts: [buildReturn(closure)],
		},
		buildDocCommentAttributes(docblock)
	);
}
