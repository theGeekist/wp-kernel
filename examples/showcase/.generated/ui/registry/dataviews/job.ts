import { type DataViewRegistryEntry } from '@wpkernel/ui/dataviews';
import * as wpkConfigModule from '../../../../wpk.config';

export const jobDataViewRegistryEntry: DataViewRegistryEntry = {
	resource: 'job',
	preferencesKey: 'acme-jobs/dataviews/job',
	metadata: wpkConfigModule.wpkConfig.resources['job'].ui!.admin!
		.dataviews as unknown as Record<string, unknown>,
};
