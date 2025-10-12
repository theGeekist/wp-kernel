import type { PhpMethodBodyBuilder } from '../template';
import type { WpPostContext } from './context';

export function appendIdentityValidation(
	context: WpPostContext,
	body: PhpMethodBodyBuilder,
	variable: string
): void {
	if (context.identity.type === 'number') {
		body.line(`if ( null === ${variable} ) {`);
		body.line(
			`        return new WP_Error( '${context.errorCode('missing_identifier')}', 'Missing identifier for ${context.titleCaseName()}.', array( 'status' => 400 ) );`
		);
		body.line('}');
		body.line(`${variable} = (int) ${variable};`);
		body.line(`if ( ${variable} <= 0 ) {`);
		body.line(
			`        return new WP_Error( '${context.errorCode('invalid_identifier')}', 'Invalid identifier for ${context.titleCaseName()}.', array( 'status' => 400 ) );`
		);
		body.line('}');
		return;
	}

	body.line(
		`if ( ! is_string( ${variable} ) || '' === trim( ${variable} ) ) {`
	);
	body.line(
		`        return new WP_Error( '${context.errorCode('missing_identifier')}', 'Missing identifier for ${context.titleCaseName()}.', array( 'status' => 400 ) );`
	);
	body.line('}');
	body.line(`${variable} = trim( (string) ${variable} );`);
}

export function appendIdentitySlugAssignment(
	context: WpPostContext,
	body: PhpMethodBodyBuilder
): void {
	if (context.identity.param !== 'slug') {
		return;
	}

	body.line(`$slug = $request->get_param( 'slug' );`);
	body.line("if ( is_string( $slug ) && '' !== trim( $slug ) ) {");
	body.line("        $post_data['post_name'] = sanitize_title( $slug );");
	body.line('}');
}

export function appendIdentitySlugUpdate(
	context: WpPostContext,
	body: PhpMethodBodyBuilder
): void {
	if (context.identity.param !== 'slug') {
		return;
	}

	body.line(`$slug = $request->get_param( 'slug' );`);
	body.line("if ( is_string( $slug ) && '' !== trim( $slug ) ) {");
	body.line("        $post_data['post_name'] = sanitize_title( $slug );");
	body.line('}');
}
