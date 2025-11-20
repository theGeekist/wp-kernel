import { EventEmitter } from 'node:events';
import type { ChildProcess, PromiseWithChild } from 'node:child_process';
import type { QuickstartDependencies } from '../../src/dx/readiness/helpers';

export type QuickstartDepsMock = {
	readonly [K in keyof QuickstartDependencies]: jest.Mock<
		ReturnType<QuickstartDependencies[K]>,
		Parameters<QuickstartDependencies[K]>
	>;
};

function makePromiseWithChild<T>(value: T): PromiseWithChild<T> {
	const promise = Promise.resolve(value) as PromiseWithChild<T>;
	promise.child = new EventEmitter() as unknown as ChildProcess;
	return promise;
}

export function createQuickstartDepsMock(): QuickstartDepsMock {
	const mkdtemp = jest.fn<
		ReturnType<QuickstartDepsMock['mkdtemp']>,
		Parameters<QuickstartDepsMock['mkdtemp']>
	>(
		() =>
			Promise.resolve('/tmp/wpk-quickstart-mock') as ReturnType<
				QuickstartDepsMock['mkdtemp']
			>
	);

	const rm = jest.fn<
		ReturnType<QuickstartDepsMock['rm']>,
		Parameters<QuickstartDepsMock['rm']>
	>(() => Promise.resolve(undefined) as ReturnType<QuickstartDepsMock['rm']>);

	const exec = jest.fn<
		ReturnType<QuickstartDepsMock['exec']>,
		Parameters<QuickstartDepsMock['exec']>
	>((..._args) =>
		makePromiseWithChild({
			stdout: 'ok',
			stderr: '',
		})
	);

	const access = jest.fn<
		ReturnType<QuickstartDepsMock['access']>,
		Parameters<QuickstartDepsMock['access']>
	>(
		() =>
			Promise.resolve(undefined) as ReturnType<
				QuickstartDepsMock['access']
			>
	);

	const resolve = jest.fn<
		ReturnType<QuickstartDepsMock['resolve']>,
		Parameters<QuickstartDepsMock['resolve']>
	>(
		() =>
			'/mock/node_modules/tsx' as ReturnType<
				QuickstartDepsMock['resolve']
			>
	);

	return { mkdtemp, rm, exec, access, resolve };
}
