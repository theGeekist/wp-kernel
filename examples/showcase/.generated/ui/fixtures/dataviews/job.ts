import { type ResourceDataViewConfig } from '@wpkernel/ui/dataviews';
import * as wpkConfigModule from '../../../../wpk.config';

export const jobDataViewConfig: ResourceDataViewConfig<unknown, unknown> =
	wpkConfigModule.wpkConfig.resources['job'].ui!.admin!.dataviews;
