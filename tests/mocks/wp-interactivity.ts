import type {
	InteractivityGlobal,
	InteractivityModule,
	InteractivityServerStateResolver,
} from '@wpkernel/core/interactivity';

function createFallback(): InteractivityModule {
	const fallback: Partial<InteractivityModule> = {
		store: ((namespace: string, definition?: Record<string, unknown>) => {
			void namespace;
			return (definition ?? {}) as ReturnType<
				InteractivityModule['store']
			>;
		}) as unknown as InteractivityModule['store'],
		getServerState: ((namespace?: string) => {
			void namespace;
			return {} as ReturnType<InteractivityModule['getServerState']>;
		}) as unknown as InteractivityModule['getServerState'],
		getConfig: ((namespace?: string) => {
			void namespace;
			return {};
		}) as unknown as InteractivityModule['getConfig'],
		getContext:
			(() => ({})) as unknown as InteractivityModule['getContext'],
		getServerContext:
			(() => ({})) as unknown as InteractivityModule['getServerContext'],
		getElement: (() =>
			undefined) as unknown as InteractivityModule['getElement'],
		withScope: ((scope: string, callback: () => unknown) => {
			void scope;
			return callback();
		}) as unknown as InteractivityModule['withScope'],
		useWatch: ((callback: () => void) =>
			callback()) as unknown as InteractivityModule['useWatch'],
		useInit: ((callback: () => void) =>
			callback()) as unknown as InteractivityModule['useInit'],
		useEffect: ((effect: () => void | (() => void)) =>
			effect()) as unknown as InteractivityModule['useEffect'],
		useLayoutEffect: ((effect: () => void | (() => void)) =>
			effect()) as unknown as InteractivityModule['useLayoutEffect'],
		useCallback: ((callback: (...args: never[]) => unknown) =>
			callback) as unknown as InteractivityModule['useCallback'],
		useMemo: ((factory: () => unknown) =>
			factory()) as unknown as InteractivityModule['useMemo'],
		splitTask: ((task: () => void) =>
			task()) as unknown as InteractivityModule['splitTask'],
		withSyncEvent: ((
			name: string,
			handler: (...args: unknown[]) => unknown
		) => {
			void name;
			return handler;
		}) as unknown as InteractivityModule['withSyncEvent'],
		useState: ((initial?: unknown) => {
			const value =
				typeof initial === 'function'
					? (initial as () => unknown)()
					: initial;
			const setState = () => undefined;
			return [value, setState];
		}) as unknown as InteractivityModule['useState'],
		useRef: ((initialValue?: unknown) => ({
			current: initialValue,
		})) as unknown as InteractivityModule['useRef'],
		privateApis:
			(() => ({})) as unknown as InteractivityModule['privateApis'],
	};

	const typed = fallback as InteractivityModule;
	(typed.getServerState as InteractivityServerStateResolver).subscribe = 0;
	return typed;
}

function resolveStub(): InteractivityModule {
	const globalRef = globalThis as InteractivityGlobal;
	if (globalRef.__WPKernelInteractivityStub) {
		return globalRef.__WPKernelInteractivityStub;
	}
	if (globalRef.wp?.interactivity) {
		return globalRef.wp.interactivity;
	}

	return createFallback();
}

const stub = resolveStub();

function passthrough<Key extends keyof InteractivityModule>(key: Key) {
	const value = stub[key];
	return value as InteractivityModule[Key];
}

export const store: InteractivityModule['store'] = passthrough('store');
export const getServerState: InteractivityModule['getServerState'] =
	passthrough('getServerState');
export const getConfig: InteractivityModule['getConfig'] =
	passthrough('getConfig');
export const getContext: InteractivityModule['getContext'] =
	passthrough('getContext');
export const getServerContext: InteractivityModule['getServerContext'] =
	passthrough('getServerContext');
export const getElement: InteractivityModule['getElement'] =
	passthrough('getElement');
export const withScope: InteractivityModule['withScope'] =
	passthrough('withScope');
export const useWatch: InteractivityModule['useWatch'] =
	passthrough('useWatch');
export const useInit: InteractivityModule['useInit'] = passthrough('useInit');
export const useEffect: InteractivityModule['useEffect'] =
	passthrough('useEffect');
export const useLayoutEffect: InteractivityModule['useLayoutEffect'] =
	passthrough('useLayoutEffect');
export const useCallback: InteractivityModule['useCallback'] =
	passthrough('useCallback');
export const useMemo: InteractivityModule['useMemo'] = passthrough('useMemo');
export const splitTask: InteractivityModule['splitTask'] =
	passthrough('splitTask');
export const withSyncEvent: InteractivityModule['withSyncEvent'] =
	passthrough('withSyncEvent');
export const useState: InteractivityModule['useState'] =
	passthrough('useState');
export const useRef: InteractivityModule['useRef'] = passthrough('useRef');
export const privateApis: InteractivityModule['privateApis'] =
	passthrough('privateApis');

const interactivityModule: InteractivityModule = {
	store,
	getServerState,
	getConfig,
	getContext,
	getServerContext,
	getElement,
	withScope,
	useWatch,
	useInit,
	useEffect,
	useLayoutEffect,
	useCallback,
	useMemo,
	splitTask,
	withSyncEvent,
	useState,
	useRef,
	privateApis,
};

export default interactivityModule;
