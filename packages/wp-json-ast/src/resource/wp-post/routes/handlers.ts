import { type RestControllerRouteHandlers } from '../../../rest-controller/routes/buildResourceControllerRouteSet';
import {
	buildWpPostStorageArtifacts,
	type BuildWpPostStorageArtifactsOptions,
} from '../buildWpPostStorageArtifacts';

export type BuildWpPostRouteHandlersOptions =
	BuildWpPostStorageArtifactsOptions;

export function buildWpPostRouteHandlers(
	options: BuildWpPostRouteHandlersOptions
): RestControllerRouteHandlers {
	const artifacts = buildWpPostStorageArtifacts(options);

	return artifacts.routeHandlers;
}
