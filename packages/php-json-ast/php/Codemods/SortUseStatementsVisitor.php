<?php

declare(strict_types=1);

namespace WPKernel\PhpJsonAst\Codemods;

use PhpParser\Node;
use PhpParser\Node\Name;
use PhpParser\Node\Stmt\GroupUse;
use PhpParser\Node\Stmt\Namespace_;
use PhpParser\Node\Stmt\Use_;
use PhpParser\Node\Stmt\UseUse;
use PhpParser\NodeVisitorAbstract;

/**
 * Sorts and groups `use` statements to provide deterministic ordering.
 */
final class SortUseStatementsVisitor extends NodeVisitorAbstract
{
    public function __construct(private readonly bool $caseSensitive = false)
    {
    }

    /**
     * @return array<int, Node>|Node|int|null
     */
    public function leaveNode(Node $node): Node|int|array|null
    {
        if ($node instanceof Namespace_) {
            $node->stmts = $this->sortStatements($node->stmts);
            return null;
        }

        if ($node instanceof Use_) {
            $node->uses = $this->sortUseUses($node->uses, null);
            return null;
        }

        if ($node instanceof GroupUse) {
            $node->uses = $this->sortUseUses($node->uses, $node->prefix);
            return null;
        }

        return null;
    }

    /**
     * @param array<Node> $nodes
     * @return array<Node>
     */
    public function afterTraverse(array $nodes): array
    {
        return $this->sortStatements($nodes);
    }

    /**
     * @param array<int, Node> $statements
     * @return array<int, Node>
     */
    private function sortStatements(array $statements): array
    {
        if ($statements === []) {
            return $statements;
        }

        $result = [];
        $buffer = [];

        foreach ($statements as $statement) {
            if ($statement instanceof Use_ || $statement instanceof GroupUse) {
                $buffer[] = $statement;
                continue;
            }

            if ($buffer !== []) {
                $result = array_merge($result, $this->sortUseStatementBuffer($buffer));
                $buffer = [];
            }

            $result[] = $statement;
        }

        if ($buffer !== []) {
            $result = array_merge($result, $this->sortUseStatementBuffer($buffer));
        }

        return array_values($result);
    }

    /**
     * @param list<Use_|GroupUse> $buffer
     * @return list<Use_|GroupUse>
     */
    private function sortUseStatementBuffer(array $buffer): array
    {
        foreach ($buffer as $statement) {
            if ($statement instanceof Use_) {
                $statement->uses = $this->sortUseUses($statement->uses, null);
                continue;
            }

            if ($statement instanceof GroupUse) {
                $statement->uses = $this->sortUseUses($statement->uses, $statement->prefix);
            }
        }

        usort(
            $buffer,
            function (Use_|GroupUse $first, Use_|GroupUse $second): int {
                $firstType = $this->normaliseStatementType($first);
                $secondType = $this->normaliseStatementType($second);

                if ($firstType !== $secondType) {
                    return $firstType <=> $secondType;
                }

                $firstKey = $this->stringifyUseStatement($first);
                $secondKey = $this->stringifyUseStatement($second);

                return $this->compareStrings($firstKey, $secondKey);
            }
        );

        return array_values($buffer);
    }

    /**
     * @param list<UseUse> $uses
     * @return list<UseUse>
     */
    private function sortUseUses(array $uses, ?Name $prefix): array
    {
        if ($uses === []) {
            return $uses;
        }

        usort(
            $uses,
            function (UseUse $first, UseUse $second) use ($prefix): int {
                $firstType = $this->normaliseUseType($first);
                $secondType = $this->normaliseUseType($second);

                if ($firstType !== $secondType) {
                    return $firstType <=> $secondType;
                }

                $firstKey = $this->stringifyUseUse($first, $prefix);
                $secondKey = $this->stringifyUseUse($second, $prefix);

                return $this->compareStrings($firstKey, $secondKey);
            }
        );

        return array_values($uses);
    }

    private function compareStrings(string $first, string $second): int
    {
        if ($this->caseSensitive) {
            return strcmp($first, $second);
        }

        $comparison = strcasecmp($first, $second);

        if ($comparison !== 0) {
            return $comparison;
        }

        return strcmp($first, $second);
    }

    private function stringifyUseStatement(Use_|GroupUse $statement): string
    {
        $parts = [];

        foreach ($statement->uses as $use) {
            $parts[] = $this->stringifyUseUse(
                $use,
                $statement instanceof GroupUse ? $statement->prefix : null
            );
        }

        return implode('|', $parts);
    }

    private function stringifyUseUse(UseUse $use, ?Name $prefix): string
    {
        $name = $use->name->toString();

        if ($prefix instanceof Name) {
            $name = $prefix->toString() . '\\' . $name;
        }

        if ($use->alias !== null) {
            $name .= ' as ' . $use->alias->toString();
        }

        return $name;
    }

    private function normaliseUseType(UseUse $use): int
    {
        return $this->mapTypeToOrder($use->type ?? Use_::TYPE_NORMAL);
    }

    private function normaliseStatementType(Use_|GroupUse $statement): int
    {
        if ($statement instanceof GroupUse) {
            return $this->mapTypeToOrder($statement->type);
        }

        return $this->mapTypeToOrder($statement->type);
    }

    private function mapTypeToOrder(int $type): int
    {
        return match ($type) {
            Use_::TYPE_FUNCTION => 1,
            Use_::TYPE_CONSTANT => 2,
            default => 0,
        };
    }
}
