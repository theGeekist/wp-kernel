import * as packageIndex from '../index';
import * as programBuilder from '../programBuilder';
import * as programWriter from '../programWriter';
import * as context from '../context';
import * as builderChannel from '../builderChannel';

describe('package entrypoints', () => {
	it('re-exports builder helpers through the package index', () => {
		expect(packageIndex.createPhpProgramBuilder).toBe(
			programBuilder.createPhpProgramBuilder
		);
		expect(packageIndex.createHelper).toBe(programBuilder.createHelper);
		expect(packageIndex.createPhpProgramWriterHelper).toBe(
			programWriter.createPhpProgramWriterHelper
		);
	});

	it('re-exports channel helpers through the package index', () => {
		expect(packageIndex.getPhpBuilderChannel).toBe(
			builderChannel.getPhpBuilderChannel
		);
		expect(packageIndex.resetPhpBuilderChannel).toBe(
			builderChannel.resetPhpBuilderChannel
		);
		expect(packageIndex.getPhpAstChannel).toBe(context.getPhpAstChannel);
		expect(packageIndex.resetPhpAstChannel).toBe(
			context.resetPhpAstChannel
		);
	});
});
