import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import { buildPolicyModule } from '@wpkernel/wp-json-ast';
import type { PolicyModuleWarning } from '@wpkernel/wp-json-ast';
import { getPhpBuilderChannel } from './channel';

export function createPhpPolicyHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.policy',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const { ir } = input;

			const namespace = `${ir.php.namespace}\\Generated\\Policy`;
			const module = buildPolicyModule({
				origin: ir.meta.origin,
				namespace,
				policyMap: ir.policyMap,
				hooks: {
					onWarning: (warning) =>
						forwardPolicyWarning(options.reporter, warning),
				},
			});

			const channel = getPhpBuilderChannel(options.context);
			for (const file of module.files) {
				const filePath = options.context.workspace.resolve(
					ir.php.outputDir,
					file.fileName
				);

				channel.queue({
					file: filePath,
					program: file.program,
					metadata: file.metadata,
					docblock: file.docblock,
					uses: file.uses,
					statements: file.statements,
				});
			}

			await next?.();
		},
	});
}

function forwardPolicyWarning(
	reporter: BuilderApplyOptions['reporter'],
	warning: PolicyModuleWarning
): void {
	switch (warning.kind) {
		case 'policy-map-warning': {
			reporter.warn('Policy helper warning emitted.', {
				code: warning.warning.code,
				message: warning.warning.message,
				context: warning.warning.context,
			});
			break;
		}
		case 'policy-definition-missing': {
			reporter.warn('Policy falling back to default capability.', {
				policy: warning.policy,
				capability: warning.fallbackCapability,
				scope: warning.fallbackScope,
			});
			break;
		}
		case 'policy-definition-unused': {
			reporter.warn('Policy definition declared but unused.', {
				policy: warning.policy,
				capability: warning.capability,
				scope: warning.scope,
			});
			break;
		}
		default:
			throw new TypeError('Unhandled policy warning kind.');
	}
}
