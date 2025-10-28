const PHP_JSON_AST_BASE = new URL(
        '../../../../packages/php-json-ast/dist/nodes/base.js',
        import.meta.url
);

export async function resolve(specifier, context, defaultResolve) {
        if (specifier === '@wpkernel/php-json-ast/nodes/base') {
                return {
                        url: PHP_JSON_AST_BASE.href,
                        shortCircuit: true,
                };
        }

        return defaultResolve(specifier, context, defaultResolve);
}
