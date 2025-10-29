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

    private string $codemodFixturesRoot;

    /**
     * @var list<string>
     */
    private array $temporaryConfigFiles = [];

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

        $codemodFixturesRoot = realpath($this->workspaceRoot . '/fixtures/codemods');
        $this->assertNotFalse($codemodFixturesRoot, 'Failed to resolve codemod fixtures root.');
        $this->codemodFixturesRoot = $codemodFixturesRoot;
    }

    protected function tearDown(): void
    {
        foreach ($this->temporaryConfigFiles as $file) {
            if (is_string($file) && is_file($file)) {
                @unlink($file);
            }
        }

        $this->temporaryConfigFiles = [];
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

    public function testItRunsConfiguredCodemodVisitorsBeforeEmittingPayload(): void
    {
        $fixturePath = $this->resolveFixturePath('CodifiedController.php');
        $configuration = $this->createCodemodConfiguration([
            'stacks' => [
                [
                    'key' => 'ingest.before-print',
                    'visitors' => [
                        [
                            'key' => 'name-resolver',
                            'options' => [
                                'preserveOriginalNames' => true,
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $command = sprintf(
            'php %s %s --config %s %s 2>&1',
            escapeshellarg($this->scriptPath),
            escapeshellarg($this->workspaceRoot),
            escapeshellarg($configuration),
            escapeshellarg($fixturePath)
        );

        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);

        $this->assertSame(0, $exitCode, sprintf("Command failed:\n%s", implode("\n", $output)));
        $this->assertNotEmpty($output, 'Ingestion script produced no output.');

        $payload = json_decode($output[0], true);
        $this->assertIsArray($payload, 'Output payload should decode to an array.');
        $program = $payload['program'] ?? null;
        $this->assertIsArray($program, 'Program should decode to an array of statements.');

        $namespacedAttributes = array_filter(
            $this->collectAttributeValues($program, 'namespacedName'),
            static fn($value): bool => is_array($value) && isset($value['parts']) && is_array($value['parts'])
        );

        $this->assertNotEmpty(
            $namespacedAttributes,
            'NameResolver visitor should annotate nodes with namespacedName attributes.'
        );

        $propertyHookMatches = array_filter(
            $namespacedAttributes,
            static fn(array $value): bool => $value['parts'] === ['Fixtures', 'Codemod', 'PropertyHook']
        );

        $this->assertNotEmpty(
            $propertyHookMatches,
            'Expected PropertyHook attribute to expose its fully qualified name.'
        );
    }

    public function testItAppliesBaselineCodemodPackVisitors(): void
    {
        $fixturePath = $this->resolveCodemodFixturePath('BaselinePack.before.php');
        $configuration = $this->createCodemodConfiguration([
            'stacks' => [
                [
                    'key' => 'ingest.before-print',
                    'visitors' => [
                        [
                            'key' => 'baseline.name-canonicaliser',
                        ],
                        [
                            'key' => 'baseline.use-grouping',
                        ],
                    ],
                ],
            ],
        ]);

        $command = sprintf(
            'php %s %s --config %s %s 2>&1',
            escapeshellarg($this->scriptPath),
            escapeshellarg($this->workspaceRoot),
            escapeshellarg($configuration),
            escapeshellarg($fixturePath)
        );

        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);

        $this->assertSame(0, $exitCode, sprintf("Command failed:\n%s", implode("\n", $output)));
        $this->assertNotEmpty($output, 'Ingestion script produced no output.');

        $payload = json_decode($output[0], true);
        $this->assertIsArray($payload, 'Output payload should decode to an array.');
        $program = $payload['program'] ?? null;
        $this->assertIsArray($program, 'Program should decode to an array of statements.');

        $expectedProgram = json_decode(
            $this->readCodemodFixture('BaselinePack.after.ast.json'),
            true
        );
        $this->assertIsArray($expectedProgram, 'Expected codemod AST should decode to an array.');
        $this->assertSame($expectedProgram, $program, 'Codemod output did not match expected AST.');
    }

    public function testItFailsWhenCodemodVisitorIsUnknown(): void
    {
        $fixturePath = $this->resolveFixturePath('CodifiedController.php');
        $configuration = $this->createCodemodConfiguration([
            'stacks' => [
                [
                    'key' => 'ingest.before-print',
                    'visitors' => [
                        [
                            'key' => 'unknown-visitor',
                        ],
                    ],
                ],
            ],
        ]);

        $command = sprintf(
            'php %s %s --config %s %s 2>&1',
            escapeshellarg($this->scriptPath),
            escapeshellarg($this->workspaceRoot),
            escapeshellarg($configuration),
            escapeshellarg($fixturePath)
        );

        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);

        $this->assertSame(1, $exitCode, 'Expected script to exit with non-zero status for unknown visitor.');
        $this->assertNotEmpty($output, 'Expected error output for unknown visitor.');
        $this->assertStringContainsString('Unknown codemod visitor "unknown-visitor"', implode("\n", $output));
    }

    public function testItFailsWhenCodemodVisitorOptionsAreInvalid(): void
    {
        $fixturePath = $this->resolveFixturePath('CodifiedController.php');
        $configuration = $this->createCodemodConfiguration([
            'stacks' => [
                [
                    'key' => 'ingest.before-print',
                    'visitors' => [
                        [
                            'key' => 'name-resolver',
                            'options' => [
                                'preserveOriginalNames' => 'true',
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $command = sprintf(
            'php %s %s --config %s %s 2>&1',
            escapeshellarg($this->scriptPath),
            escapeshellarg($this->workspaceRoot),
            escapeshellarg($configuration),
            escapeshellarg($fixturePath)
        );

        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);

        $this->assertSame(1, $exitCode, 'Expected script to exit with non-zero status for invalid options.');
        $this->assertNotEmpty($output, 'Expected error output for invalid visitor options.');
        $this->assertStringContainsString(
            'Option "preserveOriginalNames" for visitor "name-resolver"',
            implode("\n", $output)
        );
    }

    public function testItFailsWhenBaselineCodemodOptionsAreInvalid(): void
    {
        $fixturePath = $this->resolveFixturePath('CodifiedController.php');
        $configuration = $this->createCodemodConfiguration([
            'stacks' => [
                [
                    'key' => 'ingest.before-print',
                    'visitors' => [
                        [
                            'key' => 'baseline.use-grouping',
                            'options' => [
                                'caseSensitive' => 'yes',
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $command = sprintf(
            'php %s %s --config %s %s 2>&1',
            escapeshellarg($this->scriptPath),
            escapeshellarg($this->workspaceRoot),
            escapeshellarg($configuration),
            escapeshellarg($fixturePath)
        );

        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);

        $this->assertSame(1, $exitCode, 'Expected script to exit with non-zero status for invalid baseline options.');
        $this->assertNotEmpty($output, 'Expected error output for invalid baseline options.');
        $this->assertStringContainsString(
            'Option "caseSensitive" for visitor "baseline.use-grouping"',
            implode("\n", $output)
        );
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

    /**
     * @param array<string, mixed> $configuration
     */
    private function createCodemodConfiguration(array $configuration): string
    {
        $encoded = json_encode($configuration, JSON_PRETTY_PRINT);
        $this->assertNotFalse($encoded, 'Failed to encode codemod configuration.');

        $path = tempnam(sys_get_temp_dir(), 'php-json-ast-codemod');
        $this->assertIsString($path, 'Failed to create temporary configuration file.');

        $written = file_put_contents($path, $encoded);
        $this->assertNotFalse($written, 'Failed to write codemod configuration file.');

        $this->temporaryConfigFiles[] = $path;

        return $path;
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

    private function resolveCodemodFixturePath(string $fixture): string
    {
        $path = $this->codemodFixturesRoot . DIRECTORY_SEPARATOR . $fixture;
        $resolved = realpath($path);
        $this->assertNotFalse(
            $resolved,
            sprintf('Codemod fixture path did not resolve: %s', $path)
        );

        return $resolved;
    }

    private function readCodemodFixture(string $fixture): string
    {
        $path = $this->resolveCodemodFixturePath($fixture);
        $contents = file_get_contents($path);
        $this->assertNotFalse(
            $contents,
            sprintf('Failed to read codemod fixture contents: %s', $path)
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

    /**
     * @return list<mixed>
     */
    private function collectAttributeValues(mixed $value, string $attribute): array
    {
        if (!is_array($value)) {
            return [];
        }

        $found = [];

        if (array_key_exists($attribute, $value)) {
            $found[] = $value[$attribute];
        }

        foreach ($value as $child) {
            foreach ($this->collectAttributeValues($child, $attribute) as $nested) {
                $found[] = $nested;
            }
        }

        return $found;
    }
}
