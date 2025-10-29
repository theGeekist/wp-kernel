import { getPhpAstChannel, resetPhpAstChannel } from '../context';
import { createTestPipelineContext } from './testUtils.test-support';
import type { PhpFileMetadata } from '../types';

describe('PhpAstChannel', () => {
	it('memoises the channel', () => {
		const context = createTestPipelineContext();
		const first = getPhpAstChannel(context);
		const second = getPhpAstChannel(context);

		expect(second).toBe(first);
	});

	it('reuses open entries and clears them on reset', () => {
		const context = createTestPipelineContext();
		const channel = getPhpAstChannel(context);

		const metadata: PhpFileMetadata = { kind: 'capability-helper' };

		const entry = channel.open({
			key: 'demo',
			filePath: 'demo.php',
			namespace: 'Demo\\Plugin',
			metadata,
		});

		expect(entry.context.namespaceParts).toEqual(['Demo', 'Plugin']);
		entry.context.docblockLines.push('@internal demo');

		const reopened = channel.open({
			key: 'demo',
			filePath: 'demo.php',
			namespace: 'Demo\\Plugin',
			metadata,
		});

		expect(reopened).toBe(entry);
		expect(reopened.context.docblockLines).toContain('@internal demo');
		expect(channel.entries()).toHaveLength(1);

		resetPhpAstChannel(context);

		expect(channel.entries()).toHaveLength(0);
	});
});
