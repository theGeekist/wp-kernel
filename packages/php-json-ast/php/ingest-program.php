<?php

declare(strict_types=1);

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

if ($argc < 3) {
    fwrite(
        STDERR,
        "Usage: php ingest-program.php <workspace-root> [--config <path>] <file> [<file> ...]\n"
    );
    exit(1);
}

$workspaceRoot = $argv[1];

try {
    $parsedArguments = parseIngestionArguments(array_slice($argv, 2));
} catch (RuntimeException $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

$files = $parsedArguments['files'];

if (count($files) === 0) {
    fwrite(
        STDERR,
        "Usage: php ingest-program.php <workspace-root> [--config <path>] <file> [<file> ...]\n"
    );
    exit(1);
}

$configurationPath = $parsedArguments['configurationPath'];

try {
    $visitorDefinitions = loadCodemodVisitorDefinitions($configurationPath, $workspaceRoot);
} catch (CodemodConfigurationException $exception) {
    fwrite(
        STDERR,
        'Failed to load codemod configuration: ' . $exception->getMessage() . "\n"
    );
    exit(1);
}

$autoloadPath = resolveAutoloadPath($workspaceRoot, [
    buildAutoloadPathFromRoot(__DIR__ . '/..'),
    buildAutoloadPathFromRoot(dirname(__DIR__, 2)),
]);

require $autoloadPath;
require_once __DIR__ . '/Codemods/BaselineNameCanonicaliserVisitor.php';
require_once __DIR__ . '/Codemods/SortUseStatementsVisitor.php';

use PhpParser\Error;
use PhpParser\Lexer\Emulative;
use PhpParser\ParserFactory;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor;
use PhpParser\NodeVisitor\NameResolver;
use WPKernel\PhpJsonAst\Codemods\BaselineNameCanonicaliserVisitor;
use WPKernel\PhpJsonAst\Codemods\SortUseStatementsVisitor;

/**
 * @psalm-type CodemodVisitorDefinition = array{
 *     key: string,
 *     options: array<string, mixed>,
 *     stackKey: string,
 *     stackIndex: int,
 *     visitorIndex: int
 * }
 */
final class CodemodConfigurationException extends RuntimeException
{
}

$lexer = new Emulative(null, [
    'usedAttributes' => [
        'comments',
        'startLine',
        'endLine',
        'startFilePos',
        'endFilePos',
    ],
]);

$parser = (new ParserFactory())->createForNewestSupportedVersion($lexer);

$encoderFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

foreach ($files as $file) {
    $source = @file_get_contents($file);
    if ($source === false) {
        fwrite(STDERR, "Failed to read source for {$file}.\n");
        exit(1);
    }

    try {
        $statements = $parser->parse($source) ?? [];
    } catch (Error $error) {
        fwrite(STDERR, "Failed to parse {$file}: {$error->getMessage()}\n");
        exit(1);
    }

    try {
        $visitors = instantiateCodemodVisitors($visitorDefinitions);
    } catch (CodemodConfigurationException $exception) {
        fwrite(
            STDERR,
            'Failed to resolve codemod visitors: ' . $exception->getMessage() . "\n"
        );
        exit(1);
    }

    if (count($visitors) > 0) {
        $statements = applyCodemodVisitors($statements, $visitors);
    }

    $programJson = json_encode($statements, $encoderFlags);

    if ($programJson === false) {
        fwrite(STDERR, "Failed to encode AST for {$file}: " . json_last_error_msg() . "\n");
        exit(1);
    }

    $program = json_decode($programJson, true);

    if (!is_array($program)) {
        fwrite(STDERR, "Decoded AST payload for {$file} was not an array.\n");
        exit(1);
    }

    $program = normalizeValue($program);

    $result = [
        'file' => $file,
        'program' => $program,
    ];

    $resultJson = json_encode($result, $encoderFlags);

    if ($resultJson === false) {
        fwrite(STDERR, "Failed to encode ingestion payload for {$file}: " . json_last_error_msg() . "\n");
        exit(1);
    }

    echo $resultJson . "\n";
}

/**
 * @param list<string> $arguments
 * @return array{configurationPath: string|null, files: list<string>}
 */
function parseIngestionArguments(array $arguments): array
{
    $configurationPath = null;
    $files = [];

    $length = count($arguments);
    for ($index = 0; $index < $length; $index++) {
        $argument = $arguments[$index];

        if ($argument === '--config') {
            $index += 1;
            if ($index >= $length) {
                throw new RuntimeException('Missing value for --config option.');
            }

            $configurationPath = $arguments[$index];
            continue;
        }

        $files[] = $argument;
    }

    return [
        'configurationPath' => $configurationPath,
        'files' => $files,
    ];
}

/**
 * @param string|null $configurationPath
 * @param string $workspaceRoot
 * @return list<CodemodVisitorDefinition>
 */
function loadCodemodVisitorDefinitions(?string $configurationPath, string $workspaceRoot): array
{
    if ($configurationPath === null) {
        return [];
    }

    $resolvedPath = resolveCodemodConfigurationPath($configurationPath, $workspaceRoot);
    $contents = @file_get_contents($resolvedPath);

    if ($contents === false) {
        throw new CodemodConfigurationException(
            sprintf('Failed to read configuration file at %s.', $resolvedPath)
        );
    }

    $decoded = json_decode($contents, true);

    if (!is_array($decoded)) {
        throw new CodemodConfigurationException('Codemod configuration must decode to a JSON object.');
    }

    return normaliseCodemodVisitorDefinitions($decoded, $resolvedPath);
}

/**
 * @param list<CodemodVisitorDefinition> $definitions
 * @return list<NodeVisitor>
 */
function instantiateCodemodVisitors(array $definitions): array
{
    if (count($definitions) === 0) {
        return [];
    }

    $visitors = [];
    foreach ($definitions as $definition) {
        $visitors[] = createVisitorFromDefinition($definition);
    }

    return $visitors;
}

/**
 * @param array<int, mixed> $statements
 * @param list<NodeVisitor> $visitors
 * @return array<int, mixed>
 */
function applyCodemodVisitors(array $statements, array $visitors): array
{
    $traverser = new NodeTraverser();

    foreach ($visitors as $visitor) {
        $traverser->addVisitor($visitor);
    }

    /** @var array<int, mixed> $traversed */
    $traversed = $traverser->traverse($statements);

    return $traversed;
}

/**
 * @param array<string, mixed> $configuration
 * @return list<CodemodVisitorDefinition>
 */
function normaliseCodemodVisitorDefinitions(array $configuration, string $sourcePath): array
{
    if (!isset($configuration['stacks'])) {
        return [];
    }

    $stacks = $configuration['stacks'];

    if (!is_array($stacks)) {
        throw new CodemodConfigurationException(
            sprintf('Codemod configuration in %s must expose stacks as a list.', $sourcePath)
        );
    }

    if ($stacks === []) {
        return [];
    }

    if (!array_is_list($stacks)) {
        throw new CodemodConfigurationException(
            sprintf('Codemod stacks in %s must be declared as an ordered list.', $sourcePath)
        );
    }

    $definitions = [];

    foreach ($stacks as $stackIndex => $stack) {
        if (!is_array($stack)) {
            throw new CodemodConfigurationException(
                sprintf('Codemod stack at index %d must be an object.', $stackIndex)
            );
        }

        $stackKey = isset($stack['key']) && is_string($stack['key']) && $stack['key'] !== ''
            ? $stack['key']
            : sprintf('stack:%d', $stackIndex);

        $visitors = $stack['visitors'] ?? [];

        if (!is_array($visitors)) {
            throw new CodemodConfigurationException(
                sprintf('Codemod stack "%s" must declare visitors as a list.', $stackKey)
            );
        }

        if ($visitors === []) {
            continue;
        }

        if (!array_is_list($visitors)) {
            throw new CodemodConfigurationException(
                sprintf('Codemod stack "%s" must provide visitors as an ordered list.', $stackKey)
            );
        }

        foreach ($visitors as $visitorIndex => $visitor) {
            if (!is_array($visitor)) {
                throw new CodemodConfigurationException(
                    sprintf(
                        'Visitor declaration at index %d in stack "%s" must be an object.',
                        $visitorIndex,
                        $stackKey
                    )
                );
            }

            $key = $visitor['key'] ?? null;

            if (!is_string($key) || $key === '') {
                throw new CodemodConfigurationException(
                    sprintf(
                        'Visitor at index %d in stack "%s" must specify a non-empty key.',
                        $visitorIndex,
                        $stackKey
                    )
                );
            }

            $options = $visitor['options'] ?? [];

            if ($options === null) {
                $options = [];
            }

            if (!is_array($options)) {
                throw new CodemodConfigurationException(
                    sprintf(
                        'Visitor "%s" in stack "%s" must declare options as an object.',
                        $key,
                        $stackKey
                    )
                );
            }

            if ($options !== [] && array_is_list($options)) {
                throw new CodemodConfigurationException(
                    sprintf(
                        'Visitor "%s" in stack "%s" must declare options as an object.',
                        $key,
                        $stackKey
                    )
                );
            }

            /** @var CodemodVisitorDefinition $definition */
            $definition = [
                'key' => $key,
                'options' => $options,
                'stackKey' => $stackKey,
                'stackIndex' => $stackIndex,
                'visitorIndex' => $visitorIndex,
            ];

            $definitions[] = $definition;
        }
    }

    return $definitions;
}

/**
 * @param CodemodVisitorDefinition $definition
 */
function createVisitorFromDefinition(array $definition): NodeVisitor
{
    switch ($definition['key']) {
        case 'baseline.name-canonicaliser':
            return createBaselineNameCanonicaliserVisitor($definition);
        case 'baseline.use-grouping':
            return createBaselineUseGroupingVisitor($definition);
        case 'name-resolver':
            return createNameResolverVisitor($definition);
        default:
            throw new CodemodConfigurationException(
                sprintf(
                    'Unknown codemod visitor "%s" declared in stack "%s".',
                    $definition['key'],
                    $definition['stackKey']
                )
            );
    }
}

/**
 * @param CodemodVisitorDefinition $definition
 */
function createNameResolverVisitor(array $definition): NodeVisitor
{
    $options = $definition['options'];

    $supported = [
        'preserveOriginalNames' => true,
        'replaceNodes' => true,
    ];

    $resolvedOptions = [];

    foreach ($options as $option => $value) {
        if (!array_key_exists($option, $supported)) {
            throw new CodemodConfigurationException(
                sprintf(
                    'Unsupported option "%s" for visitor "%s" in stack "%s".',
                    $option,
                    $definition['key'],
                    $definition['stackKey']
                )
            );
        }

        if (!is_bool($value)) {
            throw new CodemodConfigurationException(
                sprintf(
                    'Option "%s" for visitor "%s" in stack "%s" must be a boolean.',
                    $option,
                    $definition['key'],
                    $definition['stackKey']
                )
            );
        }

        $resolvedOptions[$option] = $value;
    }

    return new NameResolver(null, $resolvedOptions);
}

/**
 * @param CodemodVisitorDefinition $definition
 */
function createBaselineNameCanonicaliserVisitor(array $definition): NodeVisitor
{
    $options = $definition['options'];

    $supported = [
        'preserveOriginalNames' => true,
        'replaceNodes' => true,
    ];

    $resolvedOptions = [];

    foreach ($options as $option => $value) {
        if (!array_key_exists($option, $supported)) {
            throw new CodemodConfigurationException(
                sprintf(
                    'Unsupported option "%s" for visitor "%s" in stack "%s".',
                    $option,
                    $definition['key'],
                    $definition['stackKey']
                )
            );
        }

        if (!is_bool($value)) {
            throw new CodemodConfigurationException(
                sprintf(
                    'Option "%s" for visitor "%s" in stack "%s" must be a boolean.',
                    $option,
                    $definition['key'],
                    $definition['stackKey']
                )
            );
        }

        $resolvedOptions[$option] = $value;
    }

    return new BaselineNameCanonicaliserVisitor($resolvedOptions);
}

/**
 * @param CodemodVisitorDefinition $definition
 */
function createBaselineUseGroupingVisitor(array $definition): NodeVisitor
{
    $options = $definition['options'];

    $supported = [
        'caseSensitive' => true,
    ];

    $resolvedOptions = [
        'caseSensitive' => false,
    ];

    foreach ($options as $option => $value) {
        if (!array_key_exists($option, $supported)) {
            throw new CodemodConfigurationException(
                sprintf(
                    'Unsupported option "%s" for visitor "%s" in stack "%s".',
                    $option,
                    $definition['key'],
                    $definition['stackKey']
                )
            );
        }

        if (!is_bool($value)) {
            throw new CodemodConfigurationException(
                sprintf(
                    'Option "%s" for visitor "%s" in stack "%s" must be a boolean.',
                    $option,
                    $definition['key'],
                    $definition['stackKey']
                )
            );
        }

        $resolvedOptions[$option] = $value;
    }

    return new SortUseStatementsVisitor($resolvedOptions['caseSensitive']);
}

function resolveCodemodConfigurationPath(string $path, string $workspaceRoot): string
{
    $candidate = $path;

    if (!isAbsolutePath($candidate)) {
        $candidate = $workspaceRoot . DIRECTORY_SEPARATOR . $candidate;
    }

    $resolved = realpath($candidate);

    if ($resolved === false) {
        throw new CodemodConfigurationException(
            sprintf('Codemod configuration file did not resolve: %s.', $candidate)
        );
    }

    return $resolved;
}

function isAbsolutePath(string $path): bool
{
    if ($path === '') {
        return false;
    }

    if ($path[0] === DIRECTORY_SEPARATOR) {
        return true;
    }

    if (preg_match('/^[A-Za-z]:\\\\/', $path) === 1) {
        return true;
    }

    return false;
}

/**
 * @param mixed $value
 * @return mixed
 */
function normalizeValue(mixed $value): mixed
{
    if (is_array($value)) {
        if (array_is_list($value)) {
            return array_map('normalizeValue', $value);
        }

        $normalized = [];
        foreach ($value as $key => $child) {
            $normalized[$key] = normalizeValue($child);
        }

        if (isset($normalized['nodeType']) && is_string($normalized['nodeType'])) {
            $normalized = normalizeNodeShape($normalized);
        }

        return $normalized;
    }

    return $value;
}

/**
 * @param array<string, mixed> $node
 * @return array<string, mixed>
 */
function normalizeNodeShape(array $node): array
{
    if (!isset($node['nodeType']) || !is_string($node['nodeType'])) {
        return $node;
    }

    switch ($node['nodeType']) {
        case 'Name':
        case 'Name_FullyQualified':
        case 'Name_Relative':
            if (isset($node['name']) && is_string($node['name'])) {
                $node['parts'] = explode('\\', $node['name']);
            }
            break;
    }

    return $node;
}

/**
 * @param list<string> $additionalCandidates
 */
function resolveAutoloadPath(string $workspaceRoot, array $additionalCandidates = []): string
{
    $candidates = array_merge(
        [buildAutoloadPathFromRoot($workspaceRoot)],
        $additionalCandidates,
        buildAutoloadCandidatesFromEnv()
    );

    $candidates = array_values(
        array_unique(
            array_filter(
                $candidates,
                static fn(string $candidate): bool => $candidate !== ''
            )
        )
    );

    foreach ($candidates as $candidate) {
        if (is_file($candidate)) {
            return $candidate;
        }
    }

    fwrite(STDERR, "Composer autoload not found at any of the following paths:\n");
    foreach ($candidates as $candidate) {
        fwrite(STDERR, " - {$candidate}\n");
    }

    exit(1);
}

function buildAutoloadPathFromRoot(string $root): string
{
    $normalizedRoot = rtrim($root, DIRECTORY_SEPARATOR);
    if ($normalizedRoot === '') {
        return '';
    }

    return $normalizedRoot . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';
}

/**
 * @return list<string>
 */
function buildAutoloadCandidatesFromEnv(): array
{
    $paths = getenv('PHP_DRIVER_AUTOLOAD_PATHS');
    if (!is_string($paths) || $paths === '') {
        return [];
    }

    $candidates = [];
    foreach (explode(PATH_SEPARATOR, $paths) as $candidate) {
        $trimmed = trim($candidate);
        if ($trimmed !== '') {
            $candidates[] = $trimmed;
        }
    }

    return $candidates;
}
