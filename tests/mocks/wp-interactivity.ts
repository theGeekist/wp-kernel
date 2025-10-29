import type * as WPInteractivity from '@wordpress/interactivity';

type WPInteractivityModule = typeof WPInteractivity;

type GlobalWithStub = {
	__WPKernelInteractivityStub?: WPInteractivityModule;
	wp?: {
		interactivity?: WPInteractivityModule;
	};
};

function createFallback(): WPInteractivityModule {
	const fallback: Partial<WPInteractivityModule> = {
		store: ((namespace: string, definition?: Record<string, unknown>) => {
			void namespace;
			return (definition ?? {}) as ReturnType<
				WPInteractivityModule['store']
			>;
		}) as unknown as WPInteractivityModule['store'],
		getServerState: ((namespace?: string) => {
			void namespace;
			return {} as ReturnType<WPInteractivityModule['getServerState']>;
		}) as unknown as WPInteractivityModule['getServerState'],
		getConfig: ((namespace?: string) => {
			void namespace;
			return {};
		}) as unknown as WPInteractivityModule['getConfig'],
		getContext:
			(() => ({})) as unknown as WPInteractivityModule['getContext'],
		getServerContext:
			(() => ({})) as unknown as WPInteractivityModule['getServerContext'],
		getElement: (() =>
			undefined) as unknown as WPInteractivityModule['getElement'],
		withScope: ((scope: string, callback: () => unknown) => {
			void scope;
			return callback();
		}) as unknown as WPInteractivityModule['withScope'],
		useWatch: ((callback: () => void) =>
			callback()) as unknown as WPInteractivityModule['useWatch'],
		useInit: ((callback: () => void) =>
			callback()) as unknown as WPInteractivityModule['useInit'],
		useEffect: ((effect: () => void | (() => void)) =>
			effect()) as unknown as WPInteractivityModule['useEffect'],
		useLayoutEffect: ((effect: () => void | (() => void)) =>
			effect()) as unknown as WPInteractivityModule['useLayoutEffect'],
		useCallback: ((callback: (...args: never[]) => unknown) =>
			callback) as unknown as WPInteractivityModule['useCallback'],
		useMemo: ((factory: () => unknown) =>
			factory()) as unknown as WPInteractivityModule['useMemo'],
		splitTask: ((task: () => void) =>
			task()) as unknown as WPInteractivityModule['splitTask'],
		withSyncEvent: ((
			name: string,
			handler: (...args: unknown[]) => unknown
		) => {
			void name;
			return handler;
		}) as unknown as WPInteractivityModule['withSyncEvent'],
		useState: ((initial?: unknown) => {
			const value =
				typeof initial === 'function'
					? (initial as () => unknown)()
					: initial;
			const setState = () => undefined;
			return [value, setState];
		}) as unknown as WPInteractivityModule['useState'],
		useRef: ((initialValue?: unknown) => ({
			current: initialValue,
		})) as unknown as WPInteractivityModule['useRef'],
		privateApis:
			(() => ({})) as unknown as WPInteractivityModule['privateApis'],
	};

	const typed = fallback as WPInteractivityModule;
	typed.getServerState.subscribe = 0;
	return typed;
}

function resolveStub(): WPInteractivityModule {
	const globalRef = globalThis as GlobalWithStub;
	if (globalRef.__WPKernelInteractivityStub) {
		return globalRef.__WPKernelInteractivityStub;
	}
	if (globalRef.wp?.interactivity) {
		return globalRef.wp.interactivity;
	}

	return createFallback();
}

const stub = resolveStub();

function passthrough<Key extends keyof WPInteractivityModule>(key: Key) {
	const value = stub[key];
	return value as WPInteractivityModule[Key];
}

export const store: WPInteractivityModule['store'] = passthrough('store');
export const getServerState: WPInteractivityModule['getServerState'] =
	passthrough('getServerState');
export const getConfig: WPInteractivityModule['getConfig'] =
	passthrough('getConfig');
export const getContext: WPInteractivityModule['getContext'] =
	passthrough('getContext');
export const getServerContext: WPInteractivityModule['getServerContext'] =
	passthrough('getServerContext');
export const getElement: WPInteractivityModule['getElement'] =
	passthrough('getElement');
export const withScope: WPInteractivityModule['withScope'] =
	passthrough('withScope');
export const useWatch: WPInteractivityModule['useWatch'] =
	passthrough('useWatch');
export const useInit: WPInteractivityModule['useInit'] = passthrough('useInit');
export const useEffect: WPInteractivityModule['useEffect'] =
	passthrough('useEffect');
export const useLayoutEffect: WPInteractivityModule['useLayoutEffect'] =
	passthrough('useLayoutEffect');
export const useCallback: WPInteractivityModule['useCallback'] =
	passthrough('useCallback');
export const useMemo: WPInteractivityModule['useMemo'] = passthrough('useMemo');
export const splitTask: WPInteractivityModule['splitTask'] =
	passthrough('splitTask');
export const withSyncEvent: WPInteractivityModule['withSyncEvent'] =
	passthrough('withSyncEvent');
export const useState: WPInteractivityModule['useState'] =
	passthrough('useState');
export const useRef: WPInteractivityModule['useRef'] = passthrough('useRef');
export const privateApis: WPInteractivityModule['privateApis'] =
	passthrough('privateApis');

const interactivityModule: WPInteractivityModule = {
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
