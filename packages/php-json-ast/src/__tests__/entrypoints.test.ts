import * as builders from '../builders';
import * as programBuilder from '../programBuilder';
import * as programWriter from '../programWriter';
import * as channels from '../channels';
import * as context from '../context';
import * as builderChannel from '../builderChannel';
import * as factories from '../factories';
import * as factoryIndex from '../factories/index';

describe('package entrypoints', () => {
	it('re-exports builder helpers', () => {
		expect(builders.createPhpProgramBuilder).toBe(
			programBuilder.createPhpProgramBuilder
		);
		expect(builders.createHelper).toBe(programBuilder.createHelper);
		expect(builders.createPhpProgramWriterHelper).toBe(
			programWriter.createPhpProgramWriterHelper
		);
	});

	it('re-exports builder channel helpers', () => {
		expect(channels.getPhpBuilderChannel).toBe(
			builderChannel.getPhpBuilderChannel
		);
		expect(channels.resetPhpBuilderChannel).toBe(
			builderChannel.resetPhpBuilderChannel
		);
		expect(channels.getPhpAstChannel).toBe(context.getPhpAstChannel);
		expect(channels.resetPhpAstChannel).toBe(context.resetPhpAstChannel);
	});

	it('re-exports factory helpers', () => {
		const keys = Object.keys(factoryIndex).filter(
			(key) => key !== '__esModule' && key !== 'default'
		);

		for (const key of keys) {
			const exported = (factories as Record<string, unknown>)[key];
			const expected = (factoryIndex as Record<string, unknown>)[key];
			expect(exported).toBe(expected);
		}
	});
});
