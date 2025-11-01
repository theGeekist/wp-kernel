import { useEffect, useState } from 'react';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceDataViewController } from '../../types';
import type { PermissionState } from '../types/state';
import { normalizeCapabilityError } from '../utils/errors';

function resolveCapabilityRuntime(
	controller: ResourceDataViewController<unknown, unknown>
) {
	const capabilityRuntime = controller.capabilities?.capability;
	if (!capabilityRuntime) {
		return undefined;
	}

	const candidate = capabilityRuntime.can;
	if (typeof candidate !== 'function') {
		return undefined;
	}

	return candidate as (
		key: string,
		...args: unknown[]
	) => boolean | Promise<boolean>;
}

function buildInitialState(capability?: string): PermissionState {
	if (!capability) {
		return { status: 'allowed' };
	}

	return { status: 'checking', capability };
}

export function usePermissionState<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	reporter: Reporter
): PermissionState {
	const capability = controller.config.screen?.menu?.capability;
	const [state, setState] = useState<PermissionState>(() =>
		buildInitialState(capability)
	);

	useEffect(() => {
		if (!capability) {
			setState({ status: 'allowed' });
			return;
		}

		const can = resolveCapabilityRuntime(
			controller as ResourceDataViewController<unknown, unknown>
		);

		if (!can) {
			reporter.warn?.(
				'Capability runtime missing for DataViews menu access',
				{
					capability,
					resource: controller.resourceName,
				}
			);
			setState({ status: 'unknown', capability });
			return;
		}

		let cancelled = false;

		const assignResult = (allowed: boolean) => {
			if (cancelled) {
				return;
			}
			setState({
				status: allowed ? 'allowed' : 'denied',
				capability,
			});
		};

		const assignError = (value: unknown) => {
			if (cancelled) {
				return;
			}
			const normalized = normalizeCapabilityError(value, reporter, {
				capability,
				resource: controller.resourceName,
			});
			setState({
				status: 'denied',
				capability,
				error: normalized,
			});
		};

		try {
			const result = can(capability);
			if (result instanceof Promise) {
				setState({ status: 'checking', capability });
				result.then(assignResult).catch(assignError);
			} else {
				assignResult(Boolean(result));
			}
		} catch (error) {
			assignError(error);
		}

		return () => {
			cancelled = true;
		};
	}, [capability, controller, reporter]);

	return state;
}
