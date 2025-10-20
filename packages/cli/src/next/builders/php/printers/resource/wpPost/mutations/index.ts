/**
 * Placeholder exports for the Phase 3 mutation builders.
 *
 * Scope 1 will replace these shims with the concrete AST emitters, while Scope 2
 * backfills the reusable macros. Keeping the contract import here makes the
 * module discoverable without forcing either effort to land first.
 */
export { WP_POST_MUTATION_CONTRACT } from '../../mutationContract';
export type { ResourceMutationContract } from '../../mutationContract';
