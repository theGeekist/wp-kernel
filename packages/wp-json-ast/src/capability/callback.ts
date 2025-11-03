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
	buildCapabilityCallbackDocblock,
} from '../common/docblock';

export function buildCallbackMethod(): PhpStmtClassMethod {
	const docblock = buildCapabilityCallbackDocblock();

	const closure = buildClosure({
		static: true,
		params: [
			buildParam(buildVariable('request'), {
				type: buildName(['WP_REST_Request']),
			}),
		],
		uses: [buildClosureUse(buildVariable('capability_key'))],
		stmts: [
			buildReturn(
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('enforce'),
					[
						buildArg(buildVariable('capability_key')),
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
				buildParam(buildVariable('capability_key'), {
					type: buildIdentifier('string'),
				}),
			],
			returnType: buildIdentifier('callable'),
			stmts: [buildReturn(closure)],
		},
		buildDocCommentAttributes(docblock)
	);
}
