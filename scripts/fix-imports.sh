#!/bin/bash

# Script to replace relative imports with @kernel/ aliases in kernel package

# Go to repo root
cd "$(dirname "$0")/.."

# Replace ../errors with @kernel/errors
find packages/kernel/src -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i '' "s|from '../errors'|from '@kernel/errors'|g" {} \;
find packages/kernel/src -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i '' "s|from '../../errors'|from '@kernel/errors'|g" {} \;
find packages/kernel/src -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i '' "s|from '../../../errors'|from '@kernel/errors'|g" {} \;

# Replace ../types with @kernel/resource for resource imports
find packages/kernel/src/resource/store -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i '' "s|from '../types'|from '@kernel/resource'|g" {} \;
find packages/kernel/src/resource/store -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i '' "s|from '../../types'|from '@kernel/resource'|g" {} \;

# Replace ../../errors in tests
find packages/kernel/src -type f -name "*.test.ts" -not -path "*/node_modules/*" -exec sed -i '' "s|from '../../errors'|from '@kernel/errors'|g" {} \;

# Replace ../types in resource tests
find packages/kernel/src/resource/__tests__ -type f -name "*.test.ts" -not -path "*/node_modules/*" -exec sed -i '' "s|from '../types'|from '@kernel/resource'|g" {} \;

# Replace ../store/types in resource tests  
find packages/kernel/src/resource/__tests__ -type f -name "*.test.ts" -not -path "*/node_modules/*" -exec sed -i '' "s|from '../store/types'|from '@kernel/resource/store/types'|g" {} \;

echo "Import replacements complete!"
