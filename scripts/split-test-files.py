#!/usr/bin/env python3
"""
Script to split massive test files into focused units
Handles proper import paths and closing braces
"""

import os

# Define splits for store.test.ts
STORE_SPLITS = [
    {
        "filename": "selectors.test.ts",
        "title": "Selectors",
        "start": 441,
        "end": 573,
    },
    {
        "filename": "resolvers.test.ts",
        "title": "Resolvers",
        "start": 574,
        "end": 718,
    },
    {
        "filename": "cache-keys.test.ts",
        "title": "Cache Keys",
        "start": 719,
        "end": 776,
    },
    {
        "filename": "thin-flat-api.test.ts",
        "title": "Thin-Flat API",
        "start": 777,
        "end": 1102,
    },
    {
        "filename": "grouped-api.test.ts",
        "title": "Grouped API",
        "start": 1103,
        "end": 1503,
    },
]

# Define splits for cache.test.ts
CACHE_SPLITS = [
    {
        "filename": "keys.test.ts",
        "title": "Cache Keys",
        "start": 18,
        "end": 263,
    },
    {
        "filename": "interpolation.test.ts",
        "title": "Interpolation",
        "start": 264,
        "end": 487,
    },
    {
        "filename": "invalidate.test.ts",
        "title": "Invalidate",
        "start": 488,
        "end": 835,
    },
    {
        "filename": "invalidate-all.test.ts",
        "title": "Invalidate All",
        "start": 836,
        "end": 935,
    },
    {
        "filename": "edge-cases.test.ts",
        "title": "Edge Cases",
        "start": 936,
        "end": 1199,
    },
]

STORE_HEADER = """/**
 * Unit tests for createStore factory - {title}
 *
 * Tests the @wordpress/data store integration
 */

import {{ createStore }} from '../../store.js';
import type {{ ResourceObject, ListResponse }} from '../../types.js';
import {{ WPKernelError }} from '../../../error/index.js';

// Mock resource for testing
interface MockThing {{
	id: number;
	title: string;
	status: string;
}}

interface MockThingQuery {{
	q?: string;
	status?: string;
}}

describe('createStore - {title}', () => {{
	let mockResource: ResourceObject<MockThing, MockThingQuery>;
	let mockListResponse: ListResponse<MockThing>;

	beforeEach(() => {{
		mockListResponse = {{
			items: [
				{{ id: 1, title: 'Thing One', status: 'active' }},
				{{ id: 2, title: 'Thing Two', status: 'inactive' }},
			],
			total: 2,
			hasMore: false,
		}};

		mockResource = {{
			name: 'thing',
			storeKey: 'wpk/thing',
			cacheKeys: {{
				list: (query) => ['thing', 'list', JSON.stringify(query || {{}})],
				get: (id) => ['thing', 'get', id],
				create: (data) => [
					'thing',
					'create',
					JSON.stringify(data || {{}}),
				],
				update: (id) => ['thing', 'update', id],
				remove: (id) => ['thing', 'remove', id],
			}},
			routes: {{
				list: {{ path: '/wpk/v1/things', method: 'GET' }},
				get: {{ path: '/wpk/v1/things/:id', method: 'GET' }},
				create: {{ path: '/wpk/v1/things', method: 'POST' }},
				update: {{ path: '/wpk/v1/things/:id', method: 'PUT' }},
				remove: {{ path: '/wpk/v1/things/:id', method: 'DELETE' }},
			}},
			fetchList: jest.fn().mockResolvedValue(mockListResponse),
			fetch: jest.fn().mockResolvedValue({{
				id: 1,
				title: 'Thing One',
				status: 'active',
			}}),
			create: jest.fn().mockResolvedValue({{
				id: 3,
				title: 'New Thing',
				status: 'active',
			}}),
			update: jest.fn().mockResolvedValue({{
				id: 1,
				title: 'Updated Thing',
				status: 'active',
			}}),
			remove: jest.fn().mockResolvedValue(undefined),
			// Thin-flat API methods
			useGet: jest.fn(),
			useList: jest.fn(),
			prefetchGet: jest.fn().mockResolvedValue(undefined),
			prefetchList: jest.fn().mockResolvedValue(undefined),
			invalidate: jest.fn(),
			key: jest.fn(
				(
					operation: 'list' | 'get' | 'create' | 'update' | 'remove',
					params?: any
				): (string | number | boolean)[] => {{
					const generators = mockResource.cacheKeys;
					const result = generators[operation]?.(params as any) || [];
					return result.filter(
						(v): v is string | number | boolean =>
							v !== null && v !== undefined
					);
				}}
			),
			store: {{}},
			// Grouped API namespaces
			select: {{
				item: jest.fn().mockReturnValue(undefined),
				items: jest.fn().mockReturnValue([]),
				list: jest.fn().mockReturnValue([]),
			}},
			use: {{
				item: jest.fn(),
				list: jest.fn(),
			}},
			get: {{
				item: jest.fn().mockResolvedValue({{
					id: 1,
					title: 'Thing One',
					status: 'active',
				}}),
				list: jest.fn().mockResolvedValue(mockListResponse),
			}},
			mutate: {{
				create: jest.fn().mockResolvedValue({{
					id: 3,
					title: 'New Thing',
					status: 'active',
				}}),
				update: jest.fn().mockResolvedValue({{
					id: 1,
					title: 'Updated Thing',
					status: 'active',
				}}),
				remove: jest.fn().mockResolvedValue(undefined),
			}},
			cache: {{
				prefetch: {{
					item: jest.fn().mockResolvedValue(undefined),
					list: jest.fn().mockResolvedValue(undefined),
				}},
				invalidate: {{
					item: jest.fn(),
					list: jest.fn(),
					all: jest.fn(),
				}},
				key: jest.fn(),
			}},
			storeApi: {{
				key: 'wpk/thing',
				descriptor: {{}},
			}},
			events: {{
				created: 'wpk.thing.created',
				updated: 'wpk.thing.updated',
				removed: 'wpk.thing.removed',
			}},
		}};
	}});

"""

CACHE_HEADER = """/**
 * @file Cache Utilities Tests - {title}
 * Consolidated tests for cache keys, interpolation, and invalidation
 */

import {{
	normalizeCacheKey,
	matchesCacheKey,
	findMatchingKeys,
	findMatchingKeysMultiple,
	interpolatePath,
	extractPathParams,
	invalidate,
	invalidateAll,
	registerStoreKey,
	type CacheKeyPattern,
}} from '../../cache.js';
import {{ WPKernelError }} from '../../../error/index.js';

// Mock window.wp global
interface WindowWithWp extends Window {{
	wp?: {{
		data?: {{
			dispatch: jest.Mock;
			select: jest.Mock;
		}};
		hooks?: {{
			doAction: jest.Mock;
		}};
	}};
}}

"""


def split_store_tests():
    """Split store.test.ts into multiple files"""
    source_file = "packages/core/src/resource/__tests__/store.test.ts"
    out_dir = "packages/core/src/resource/__tests__/store"
    
    with open(source_file, 'r') as f:
        lines = f.readlines()
    
    for split in STORE_SPLITS:
        output_path = os.path.join(out_dir, split["filename"])
        
        # Skip if already exists
        if os.path.exists(output_path):
            print(f"Skipping {split['filename']} (already exists)")
            continue
        
        print(f"Creating {split['filename']}...")
        
        with open(output_path, 'w') as f:
            # Write header
            f.write(STORE_HEADER.format(title=split["title"]))
            
            # Write test section (lines are 0-indexed, but line numbers are 1-indexed)
            test_lines = lines[split["start"]-1:split["end"]]
            f.writelines(test_lines)
            
            # Close describe block
            f.write("\n});\n")
        
        print(f"✓ Created {split['filename']}")


def split_cache_tests():
    """Split cache.test.ts into multiple files"""
    source_file = "packages/core/src/resource/__tests__/cache.test.ts"
    out_dir = "packages/core/src/resource/__tests__/cache"
    
    with open(source_file, 'r') as f:
        lines = f.readlines()
    
    for split in CACHE_SPLITS:
        output_path = os.path.join(out_dir, split["filename"])
        
        print(f"Creating {split['filename']}...")
        
        with open(output_path, 'w') as f:
            # Write header
            f.write(CACHE_HEADER.format(title=split["title"]))
            
            # Write test section
            test_lines = lines[split["start"]-1:split["end"]]
            f.writelines(test_lines)
        
        print(f"✓ Created {split['filename']}")


if __name__ == "__main__":
    print("Splitting test files...\n")
    
    print("=== Store Tests ===")
    split_store_tests()
    
    print("\n=== Cache Tests ===")
    split_cache_tests()
    
    print("\n✅ Done! Run 'pnpm test packages/core/src/resource' to verify.")
