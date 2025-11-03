<?php

namespace Fixtures\NodeFinder;

enum DocumentStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived;
}

final class ExampleRecord
{
    public readonly string $title;
    public readonly string $slug = 'initial';
    protected static readonly int $version = 1;

    public function __construct(
        public readonly string $name,
        private int $count,
        protected readonly \DateTimeImmutable $createdAt = new \DateTimeImmutable(),
        public \DateTimeImmutable $updatedAt = new \DateTimeImmutable()
    ) {
        $state = DocumentStatus::Draft;
        $other = DocumentStatus::Published;
        $late = DocumentStatus::Archived;
        $className = self::class;
    }

    public function describe(DocumentStatus $status): string
    {
        return match ($status) {
            DocumentStatus::Draft => 'draft',
            DocumentStatus::Published => 'published',
            DocumentStatus::Archived => 'archived',
        };
    }
}
