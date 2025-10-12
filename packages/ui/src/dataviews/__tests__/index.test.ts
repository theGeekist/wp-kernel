import * as dataViewsExports from '../index';

describe('dataviews public index', () => {
	it('re-exports primary factory functions', () => {
		expect(typeof dataViewsExports.ResourceDataView).toBe('function');
		expect(typeof dataViewsExports.createResourceDataViewController).toBe(
			'function'
		);
		expect(typeof dataViewsExports.createDataFormController).toBe(
			'function'
		);
		expect(typeof dataViewsExports.createDataViewsRuntime).toBe('function');
		expect(typeof dataViewsExports.ensureControllerRuntime).toBe(
			'function'
		);
	});
});
