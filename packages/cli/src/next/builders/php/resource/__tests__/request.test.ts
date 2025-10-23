import { createRequestParamAssignment } from '../request';

describe('request helpers', () => {
	it('creates assignments without casts', () => {
		const printable = createRequestParamAssignment({
			requestVariable: '$request',
			param: 'slug',
			indentLevel: 1,
		});

		expect(printable.lines).toEqual([
			"        $slug = $request->get_param('slug');",
		]);
	});

	it('creates assignments with casts', () => {
		const printable = createRequestParamAssignment({
			requestVariable: 'request',
			targetVariable: 'per_page',
			param: 'per_page',
			cast: 'int',
			indentLevel: 2,
		});

		expect(printable.lines).toEqual([
			"                $per_page = (int) $request->get_param('per_page');",
		]);
	});
});
