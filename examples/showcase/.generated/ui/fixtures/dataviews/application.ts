import { type ResourceDataViewConfig } from '@wpkernel/ui/dataviews';
import * as wpkConfigModule from '../../../../wpk.config';

export const applicationDataViewConfig: ResourceDataViewConfig<
	unknown,
	unknown
> = wpkConfigModule.wpkConfig.resources['application'].ui!.admin!.dataviews;
