/* AUTO-GENERATED WPK STUB: safe to edit. */
import { registerBlockType } from '@wordpress/blocks';
// Vite/tsconfig should allow JSON imports (.d.ts for JSON can be global)
import metadata from './block.json';

function Edit() {
	return <div>{metadata.title || 'Block'} (edit)</div>;
}

// Saved HTML is final for JS-only blocks:
const save = () => <div>{metadata.title || 'Block'} (save)</div>;

registerBlockType(metadata as any, { edit: Edit, save });
