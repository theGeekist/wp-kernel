export type { WorkspaceOptions } from '@wpkernel/test-utils/integration';
export {
	withWorkspace,
	createWorkspaceRunner,
	buildPhpIntegrationEnv,
	buildCliIntegrationEnv,
	sanitizePhpIntegrationEnv,
	buildNodeOptions,
	runNodeProcess,
	runProcess,
} from '@wpkernel/test-utils/integration';
export type { WorkspaceMockOptions } from '@wpkernel/test-utils/workspace.test-support';
export { makeWorkspaceMock } from '@wpkernel/test-utils/workspace.test-support';
