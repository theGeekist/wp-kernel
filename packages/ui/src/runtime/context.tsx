/* @jsxImportSource react */
import { createContext, useContext, type ReactNode } from 'react';
import { WPKernelError } from '@wpkernel/core/error';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';

const KernelUIContext = createContext<WPKernelUIRuntime | null>(null);

export interface WPKernelUIProviderProps {
	runtime: WPKernelUIRuntime;
	children: ReactNode;
}

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

export function useWPKernelUI(): WPKernelUIRuntime {
	const runtime = useContext(KernelUIContext);
	if (!runtime) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Kernel UI runtime unavailable. Attach UI bindings via configureWPKernel({ ui: { attach } }) and wrap your React tree with <WPKernelUIProvider />.',
		});
	}
	return runtime;
}

export function useOptionalKernelUI(): WPKernelUIRuntime | null {
	return useContext(KernelUIContext);
}
