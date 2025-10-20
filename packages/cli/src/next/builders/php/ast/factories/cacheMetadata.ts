import type {
	PhpFileMetadata,
	ResourceControllerCacheEvent,
	ResourceControllerCacheMetadata,
	ResourceControllerMetadata,
} from '../types';

export interface ResourceMetadataHost {
	getMetadata: () => PhpFileMetadata;
	setMetadata: (metadata: PhpFileMetadata) => void;
}

function isResourceControllerMetadata(
	metadata: PhpFileMetadata
): metadata is ResourceControllerMetadata {
	return metadata.kind === 'resource-controller';
}

function cloneCacheEvent(
	event: ResourceControllerCacheEvent
): ResourceControllerCacheEvent {
	return {
		...event,
		segments: [...event.segments],
	};
}

function mergeCacheMetadata(
	cache: ResourceControllerCacheMetadata | undefined,
	event: ResourceControllerCacheEvent
): ResourceControllerCacheMetadata {
	if (!cache) {
		return { events: [cloneCacheEvent(event)] };
	}

	return {
		events: [...cache.events, cloneCacheEvent(event)],
	};
}

export function appendResourceControllerCacheEvent(
	host: ResourceMetadataHost,
	event: ResourceControllerCacheEvent
): void {
	const metadata = host.getMetadata();
	if (!isResourceControllerMetadata(metadata)) {
		return;
	}

	const nextCache = mergeCacheMetadata(metadata.cache, event);
	host.setMetadata({
		...metadata,
		cache: nextCache,
	});
}
