import type { PhpMethodBodyBuilder } from '../template';
import type { WpPostContext } from './context';

export function appendSupportedFieldAssignments(
	context: WpPostContext,
	body: PhpMethodBodyBuilder
): void {
	appendSupportedFieldHandling(context, body);
}

export function appendSupportedFieldUpdates(
	context: WpPostContext,
	body: PhpMethodBodyBuilder
): void {
	appendSupportedFieldHandling(context, body);
}

function appendSupportedFieldHandling(
	context: WpPostContext,
	body: PhpMethodBodyBuilder
): void {
	if (context.supports.has('title')) {
		body.line(`$title = $request->get_param( 'title' );`);
		body.line('if ( is_string( $title ) ) {');
		body.line("        $post_data['post_title'] = $title;");
		body.line('}');
	}

	if (context.supports.has('editor')) {
		body.line(`$content = $request->get_param( 'content' );`);
		body.line('if ( is_string( $content ) ) {');
		body.line("        $post_data['post_content'] = $content;");
		body.line('}');
	}

	if (context.supports.has('excerpt')) {
		body.line(`$excerpt = $request->get_param( 'excerpt' );`);
		body.line('if ( is_string( $excerpt ) ) {');
		body.line("        $post_data['post_excerpt'] = $excerpt;");
		body.line('}');
	}
}
