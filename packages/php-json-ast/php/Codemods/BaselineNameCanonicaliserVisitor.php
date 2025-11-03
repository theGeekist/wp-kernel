<?php

declare(strict_types=1);

namespace WPKernel\PhpJsonAst\Codemods;

use PhpParser\NodeVisitor\NameResolver;

/**
 * Canonicalises symbol names using PhpParser's NameResolver with sensible defaults.
 */
final class BaselineNameCanonicaliserVisitor extends NameResolver
{
    /**
     * @param array{replaceNodes?: bool, preserveOriginalNames?: bool} $options
     */
    public function __construct(array $options = [])
    {
        $resolvedOptions = [
            'replaceNodes' => false,
            'preserveOriginalNames' => true,
        ];

        foreach ($options as $option => $value) {
            $resolvedOptions[$option] = $value;
        }

        parent::__construct(null, $resolvedOptions);
    }
}
