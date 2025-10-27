import { finalizeIrDraft, buildIrDraft, type MutableIr } from '../types';
import { KernelError } from '@wpkernel/core/error';
import type { FragmentFinalizationMetadata } from '@wpkernel/core/pipeline';
import { makeKernelConfigFixture } from '@wpkernel/test-utils/next/printers.test-support';

function createHelpersMetadata(
	executed: readonly string[],
	missing: readonly string[]
): FragmentFinalizationMetadata<'fragment'> {
	return {
		fragments: {
			kind: 'fragment',
			registered: Array.from(new Set([...executed, ...missing])),
			executed: [...executed],
			missing: [...missing],
		},
	};
}

function buildDraft(): MutableIr {
	const config = makeKernelConfigFixture();
	const draft = buildIrDraft({
		config,
		namespace: config.namespace,
		origin: 'typescript',
		sourcePath: '/tmp/kernel.config.ts',
	});

	draft.meta = {
		version: 1,
		namespace: config.namespace,
		sourcePath: '/tmp/kernel.config.ts',
		origin: 'typescript',
		sanitizedNamespace: 'TestNamespace',
	};
	draft.policyMap = {
		sourcePath: undefined,
		definitions: [],
		fallback: {
			capability: 'manage_options',
			appliesTo: 'object',
		},
		missing: [],
		unused: [],
		warnings: [],
	};
	draft.php = {
		namespace: 'TestNamespace',
		autoload: 'inc/',
		outputDir: '.generated/php',
	};

	return draft;
}

describe('finalizeIrDraft', () => {
	const REQUIRED = [
		'ir.meta.core',
		'ir.schemas.core',
		'ir.resources.core',
		'ir.policies.core',
		'ir.policy-map.core',
		'ir.diagnostics.core',
		'ir.blocks.core',
		'ir.ordering.core',
		'ir.validation.core',
	] as const;

	it('returns a completed IR when all core fragments executed', () => {
		const draft = buildDraft();
		const helpers = createHelpersMetadata(REQUIRED, []);

		const ir = finalizeIrDraft(draft, helpers);

		expect(ir.meta.namespace).toBe(draft.meta!.namespace);
		expect(ir.policyMap).toBe(draft.policyMap);
		expect(ir.php).toBe(draft.php);
	});

	it('throws when any required fragment did not execute', () => {
		const draft = buildDraft();
		const helpers = createHelpersMetadata(
			REQUIRED.filter((key) => key !== 'ir.policy-map.core'),
			['ir.policy-map.core']
		);

		expect(() => finalizeIrDraft(draft, helpers)).toThrow(KernelError);
	});

	it('throws when metadata reports missing fragments even if executed list contains them', () => {
		const draft = buildDraft();
		const helpers = createHelpersMetadata(REQUIRED, ['ir.resources.core']);

		expect(() => finalizeIrDraft(draft, helpers)).toThrow(KernelError);
	});
});
