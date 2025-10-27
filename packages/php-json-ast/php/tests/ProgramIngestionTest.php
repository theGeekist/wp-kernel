<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use PhpParser\Modifiers;
use PhpParser\Node\Stmt\Class_;

final class ProgramIngestionTest extends TestCase
{
    private string $scriptPath;

    private string $workspaceRoot;

    private string $fixturesRoot;

    protected function setUp(): void
    {
        $this->scriptPath = realpath(__DIR__ . '/../ingest-program.php');
        $this->assertNotFalse($this->scriptPath, 'Failed to resolve ingestion script path.');

        $workspaceRoot = realpath(__DIR__ . '/../..');
        $this->assertNotFalse($workspaceRoot, 'Failed to resolve workspace root.');
        $this->workspaceRoot = $workspaceRoot;

        $fixturesRoot = realpath($this->workspaceRoot . '/fixtures/ingestion');
        $this->assertNotFalse($fixturesRoot, 'Failed to resolve ingestion fixtures root.');
        $this->fixturesRoot = $fixturesRoot;
    }

    public function testItEmitsSchemaFaithfulProgramJson(): void
    {
        $fixturePath = $this->resolveFixturePath('CodifiedController.php');

        $command = sprintf(
            'php %s %s %s 2>&1',
            escapeshellarg($this->scriptPath),
            escapeshellarg($this->workspaceRoot),
            escapeshellarg($fixturePath)
        );

        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);

        $this->assertSame(0, $exitCode, sprintf("Command failed:\n%s", implode("\n", $output)));
        $this->assertNotEmpty($output, 'Ingestion script produced no output.');

        $payload = json_decode($output[0], true);
        $this->assertIsArray($payload, 'Output payload should decode to an array.');
        $this->assertArrayHasKey('file', $payload);
        $this->assertArrayHasKey('program', $payload);
        $this->assertSame($fixturePath, $payload['file']);

        $program = $payload['program'];
        $this->assertIsArray($program, 'Program should decode to an array of statements.');

        $expectedProgram = json_decode(
            $this->readFixture('CodifiedController.ast.json'),
            true
        );
        $this->assertIsArray($expectedProgram, 'Expected AST snapshot should decode to an array.');
        $this->assertSame($expectedProgram, $program, 'Ingested program AST did not match snapshot.');

        $namespace = $this->findFirstNodeByType($program, 'Stmt_Namespace');
        $this->assertIsArray($namespace, 'Namespace node should exist.');
        $this->assertSame(['Fixtures', 'Codemod'], $namespace['name']['parts'] ?? []);

        $classNode = $this->findClassByName($namespace['stmts'] ?? [], 'CodifiedController');
        $this->assertIsArray($classNode, 'Class node should exist within namespace.');
        $this->assertSame(Class_::MODIFIER_FINAL, $classNode['flags'] ?? null, 'Class modifiers were not preserved.');

        $attrGroups = $classNode['attrGroups'] ?? [];
        $this->assertNotEmpty($attrGroups, 'Class attribute groups should be preserved.');
        $this->assertSame(['PropertyHook'], $attrGroups[0]['attrs'][0]['name']['parts'] ?? []);
        $this->assertSame(
            'controller',
            $attrGroups[0]['attrs'][0]['args'][0]['value']['value'] ?? null,
            'Class attribute arguments were not preserved.'
        );

        $propertyNode = $this->findFirstNodeByType($classNode['stmts'] ?? [], 'Stmt_Property');
        $this->assertIsArray($propertyNode, 'Property node should exist.');
        $this->assertSame(Modifiers::PUBLIC, $propertyNode['flags'] ?? null, 'Property visibility modifier was not preserved.');

        $propertyAttributes = $propertyNode['attributes']['comments'] ?? [];
        $this->assertNotEmpty($propertyAttributes, 'Property doc comment should be preserved.');
        $this->assertSame('Comment_Doc', $propertyAttributes[0]['nodeType'] ?? null);

        $propertyAttrGroup = $propertyNode['attrGroups'][0]['attrs'][0] ?? null;
        $this->assertIsArray($propertyAttrGroup, 'Property attribute group should exist.');
        $this->assertSame('resources', $propertyAttrGroup['args'][0]['value']['value'] ?? null);
    }

    public function testItSupportsMultipleFilesInASingleInvocation(): void
    {
        $fixturePath = $this->resolveFixturePath('CodifiedController.php');

        $command = sprintf(
            'php %s %s %s %s 2>&1',
            escapeshellarg($this->scriptPath),
            escapeshellarg($this->workspaceRoot),
            escapeshellarg($fixturePath),
            escapeshellarg($fixturePath)
        );

        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);

        $this->assertSame(0, $exitCode, sprintf("Command failed:\n%s", implode("\n", $output)));
        $this->assertCount(2, $output, 'Expected one JSON payload per requested file.');

        foreach ($output as $line) {
            $payload = json_decode($line, true);
            $this->assertIsArray($payload);
            $this->assertSame($fixturePath, $payload['file'] ?? null);
        }
    }

    private function resolveFixturePath(string $fixture): string
    {
        $path = $this->fixturesRoot . DIRECTORY_SEPARATOR . $fixture;
        $resolved = realpath($path);
        $this->assertNotFalse(
            $resolved,
            sprintf('Fixture path did not resolve: %s', $path)
        );

        return $resolved;
    }

    private function readFixture(string $fixture): string
    {
        $path = $this->resolveFixturePath($fixture);
        $contents = file_get_contents($path);
        $this->assertNotFalse(
            $contents,
            sprintf('Failed to read fixture contents: %s', $path)
        );

        return $contents;
    }

    /**
     * @param array<int, array<string, mixed>> $nodes
     * @return array<string, mixed>|null
     */
    private function findFirstNodeByType(array $nodes, string $target): ?array
    {
        foreach ($nodes as $node) {
            if (($node['nodeType'] ?? null) === $target) {
                return $node;
            }
        }

        return null;
    }

    /**
     * @param array<int, array<string, mixed>> $nodes
     * @return array<string, mixed>|null
     */
    private function findClassByName(array $nodes, string $expected): ?array
    {
        foreach ($nodes as $node) {
            if (($node['nodeType'] ?? null) !== 'Stmt_Class') {
                continue;
            }

            $nameNode = $node['name'] ?? null;
            if (!is_array($nameNode)) {
                continue;
            }

            $identifier = $nameNode['name'] ?? $nameNode['value'] ?? null;
            if ($identifier === $expected) {
                return $node;
            }
        }

        return null;
    }
}
