/* @jsxImportSource react */
import { act, type ComponentType, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

if (typeof globalThis !== 'undefined') {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
}

interface RenderHookOptions<TProps> {
	initialProps?: TProps;
	wrapper?: ComponentType<{ children: ReactNode }>;
}

interface RenderHookResult<TResult, TProps> {
	result: { current: TResult };
	rerender: (props?: TProps) => void;
	unmount: () => void;
}

export function renderHook<TResult, TProps = undefined>(
	callback: (props: TProps) => TResult,
	options: RenderHookOptions<TProps> = {}
): RenderHookResult<TResult, TProps> {
	const container = document.createElement('div');
	const root = createRoot(container);
	let hookProps = options.initialProps as TProps;
	const Wrapper = options.wrapper;

	const result: { current: TResult } = {
		current: undefined as unknown as TResult,
	};

	function HookComponent({ props }: { props: TProps }) {
		result.current = callback(props);
		return null;
	}

	function renderWithWrapper(element: ReactNode) {
		if (!Wrapper) {
			return element;
		}

		return <Wrapper>{element}</Wrapper>;
	}

	act(() => {
		root.render(renderWithWrapper(<HookComponent props={hookProps} />));
	});

	return {
		result,
		rerender(nextProps?: TProps) {
			hookProps = (nextProps ?? hookProps) as TProps;
			act(() => {
				root.render(
					renderWithWrapper(<HookComponent props={hookProps} />)
				);
			});
		},
		unmount() {
			act(() => {
				root.unmount();
			});
		},
	};
}

export function createDeferred<T = void>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}
