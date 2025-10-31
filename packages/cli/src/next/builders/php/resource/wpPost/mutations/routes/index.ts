/* istanbul ignore file -- module forwards route builders from wp-json-ast */

export type {
	BuildCreateRouteStatementsOptions,
	BuildDeleteRouteStatementsOptions,
	BuildMutationRouteBaseOptions,
	BuildUpdateRouteStatementsOptions,
} from './types';
export { buildCreateRouteStatements } from './create';
export { buildUpdateRouteStatements } from './update';
export { buildDeleteRouteStatements } from './remove';
