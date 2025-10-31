/* istanbul ignore file -- surface only re-exports shared mutation helpers */

export {
	prepareWpPostResponse,
	syncWpPostMeta,
	syncWpPostTaxonomies,
} from '@wpkernel/wp-json-ast';

export type {
	MutationHelperOptions,
	MutationIdentity,
} from '@wpkernel/wp-json-ast';
