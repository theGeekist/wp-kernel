/**
 * Adapter utilities for integrating kernel extensions.
 */
export { runAdapterExtensions } from './extensions';

export type { AdapterExtensionRunResult } from './extensions';

export type {
	AdapterExtension,
	AdapterExtensionContext,
	AdapterExtensionFactory,
} from '../config/types';
