/* @jsxImportSource react */
import { createContext, useContext, type ReactNode } from 'react';
import { KernelError } from '@geekist/wp-kernel/error';
import type { KernelUIRuntime } from '@geekist/wp-kernel/data';

const KernelUIContext = createContext<KernelUIRuntime | null>(null);

export interface KernelUIProviderProps {
	runtime: KernelUIRuntime;
	children: ReactNode;
}

export function KernelUIProvider({ runtime, children }: KernelUIProviderProps) {
	return (
		<KernelUIContext.Provider value={runtime}>
			{children}
		</KernelUIContext.Provider>
	);
}

export function useKernelUI(): KernelUIRuntime {
	const runtime = useContext(KernelUIContext);
	if (!runtime) {
		throw new KernelError('DeveloperError', {
			message:
				'Kernel UI runtime unavailable. Attach UI bindings via configureKernel({ ui: { attach } }) and wrap your React tree with <KernelUIProvider />.',
		});
	}
	return runtime;
}

export function useOptionalKernelUI(): KernelUIRuntime | null {
	return useContext(KernelUIContext);
}
