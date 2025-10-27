<?php

declare(strict_types=1);

namespace Fixtures\Codemod;

use Attribute;

#[Attribute(Attribute::TARGET_PROPERTY)]
final class PropertyHook
{
    public function __construct(
        public readonly string $name,
    ) {
    }
}

#[PropertyHook('controller')]
final class CodifiedController
{
    /**
     * @var list<string>
     */
    #[PropertyHook('resources')]
    public array $resources = [];

    /**
     * Describe the controller lifecycle.
     */
    public function handle(): void
    {
    }
}
