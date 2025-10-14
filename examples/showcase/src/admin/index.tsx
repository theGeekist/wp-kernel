/**
 * Admin Entry Point
 *
 * Mounts the admin React application.
 * This pattern will be formalized in Sprint 5's mountAdmin() API.
 *
 * Script Modules load after DOMContentLoaded by default, so we can
 * directly access the DOM without jQuery-style ready handlers.
 */

import { createRoot } from '@wordpress/element';
import { KernelUIProvider } from '@wpkernel/ui';
import type { KernelUIRuntime } from '@wpkernel/core/data';
import { JobsList } from './pages/JobsList';

/**
 * Root component
 */
function App(): JSX.Element {
	return <JobsList />;
}

/**
 * Mount the admin application
 *
 * Called by main index.ts when #wpk-admin-root is detected.
 * @param runtime
 */
export function mountAdmin(runtime: KernelUIRuntime) {
	const rootElement = document.getElementById('wpk-admin-root');

	if (!rootElement) {
		console.warn(
			'[WP Kernel Showcase] Admin mount point #wpk-admin-root not found'
		);
		return;
	}

	// Create React root and render the application
	const root = createRoot(rootElement);
	root.render(
		<KernelUIProvider runtime={runtime}>
			<App />
		</KernelUIProvider>
	);
}
