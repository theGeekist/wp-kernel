export interface CorePipelineConfig {
	readonly enabled: boolean;
}

const DEFAULT_CONFIG: CorePipelineConfig = { enabled: false };

let currentConfig: CorePipelineConfig = { ...DEFAULT_CONFIG };

export function setCorePipelineConfig(
	config: Partial<CorePipelineConfig>
): void {
	currentConfig = {
		enabled: config.enabled ?? currentConfig.enabled,
	};
}

export function resetCorePipelineConfig(): void {
	currentConfig = { ...DEFAULT_CONFIG };
}

export function getCorePipelineConfig(): CorePipelineConfig {
	return currentConfig;
}

export function isCorePipelineEnabled(): boolean {
	return currentConfig.enabled;
}
