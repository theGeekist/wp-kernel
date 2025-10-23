import { assembleMethodTemplate, PHP_INDENT } from '../template';

describe('assembleMethodTemplate', () => {
	it('renders docblocks and indents body lines', () => {
		const lines = assembleMethodTemplate({
			signature: 'public function demo(): void',
			indentLevel: 1,
			docblock: ['Example docblock'],
			body: (body) => {
				body.line('// comment');
				body.blank();
				body.raw(`${PHP_INDENT.repeat(2)}return true;`);
			},
		});

		expect(lines).toEqual([
			`${PHP_INDENT}/**`,
			`${PHP_INDENT} * Example docblock`,
			`${PHP_INDENT} */`,
			`${PHP_INDENT}public function demo(): void`,
			`${PHP_INDENT}{`,
			`${PHP_INDENT}${PHP_INDENT}// comment`,
			'',
			`${PHP_INDENT}${PHP_INDENT}return true;`,
			`${PHP_INDENT}}`,
		]);
	});

	it('omits docblocks and body when no lines are emitted', () => {
		const lines = assembleMethodTemplate({
			signature: 'public function empty(): void',
			indentLevel: 0,
			body: () => {
				// Intentionally no-op
			},
		});

		expect(lines).toEqual(['public function empty(): void', '{', '}']);
	});
});
