/* @jsxImportSource react */
import { createContext, useContext, type ReactNode } from 'react';
import { WPKernelError } from '@wpkernel/core/error';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';

const WPKernelUIContext = createContext<WPKernelUIRuntime | null>(null);

/**
 * Props for the WPKernelUIProvider component.
 *
 * @category Provider
 */
export interface WPKernelUIProviderProps {
	/** The WPKernel UI runtime instance. */
	runtime: WPKernelUIRuntime;
	/** The React nodes to render within the provider. */
	children: ReactNode;
}

/**
 * Provides the WPKernel UI runtime to React components.
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
		<WPKernelUIContext.Provider value={runtime}>
			{children}
		</WPKernelUIContext.Provider>
	);
}

/**
 * Hook to access the WPKernel UI runtime.
 *
 * Throws an error if the runtime is not available in the current context.
 *
 * @category Provider
 * @returns The WPKernel UI runtime.
 */
export function useWPKernelUI(): WPKernelUIRuntime {
	const runtime = useContext(WPKernelUIContext);
	if (!runtime) {
		throw new WPKernelError('DeveloperError', {
			message:
				'WPKernel UI runtime unavailable. Attach UI bindings via configureWPKernel({ ui: { attach } }) and wrap your React tree with <WPKernelUIProvider />.',
		});
	}
	return runtime;
}

/**
 * Hook to access the WPKernel UI runtime, but returns null if not available.
 *
 * @category Provider
 * @returns The WPKernel UI runtime or null.
 */
export function useOptionalWPKernelUI(): WPKernelUIRuntime | null {
	return useContext(WPKernelUIContext);
}
