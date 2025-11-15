import { type DataViewRegistryEntry } from '@wpkernel/ui/dataviews';
import * as wpkConfigModule from '../../../../wpk.config';

export const applicationDataViewRegistryEntry: DataViewRegistryEntry = {
	resource: 'application',
	preferencesKey: 'acme-jobs/dataviews/application',
	metadata: wpkConfigModule.wpkConfig.resources['application'].ui!.admin!
		.dataviews as unknown as Record<string, unknown>,
};
