/* @jsxImportSource react */
import { createContext, useContext, type ReactNode } from 'react';
import { WPKernelError } from '@wpkernel/core/error';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';

const KernelUIContext = createContext<WPKernelUIRuntime | null>(null);

/**
 * Props for the WPKernelUIProvider component.
 *
 * @category Provider
 */
export interface WPKernelUIProviderProps {
	/** The WP Kernel UI runtime instance. */
	runtime: WPKernelUIRuntime;
	/** The React nodes to render within the provider. */
	children: ReactNode;
}

/**
 * Provides the WP Kernel UI runtime to React components.
 *
 * @category Provider
 * @param    props.runtime
 * @param    props.children
 * @param    props          - The provider props.
 */
export function WPKernelUIProvider({
	runtime,
	children,
}: WPKernelUIProviderProps) {
	return (
		<KernelUIContext.Provider value={runtime}>
			{children}
		</KernelUIContext.Provider>
	);
}

/**
 * Hook to access the WP Kernel UI runtime.
 *
 * Throws an error if the runtime is not available in the current context.
 *
 * @category Provider
 * @returns The WP Kernel UI runtime.
 */
export function useWPKernelUI(): WPKernelUIRuntime {
	const runtime = useContext(KernelUIContext);
	if (!runtime) {
		throw new WPKernelError('DeveloperError', {
			message:
				'WP Kernel UI runtime unavailable. Attach UI bindings via configureWPKernel({ ui: { attach } }) and wrap your React tree with <WPKernelUIProvider />.',
		});
	}
	return runtime;
}

/**
 * Hook to access the WP Kernel UI runtime, but returns null if not available.
 *
 * @category Provider
 * @returns The WP Kernel UI runtime or null.
 */
export function useOptionalKernelUI(): WPKernelUIRuntime | null {
	return useContext(KernelUIContext);
}
