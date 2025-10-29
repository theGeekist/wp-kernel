<?php

declare(strict_types=1);

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

require_once __DIR__ . '/support/autoload.php';

if ($argc < 4) {
    fwrite(
        STDERR,
        "Usage: php query-nodefinder.php <workspace-root> --queries <path> <file> [<file> ...]\n"
    );
    exit(1);
}

$workspaceRoot = $argv[1];

try {
    $parsedArguments = parseNodeFinderArguments(array_slice($argv, 2));
} catch (RuntimeException $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

$files = $parsedArguments['files'];

if (count($files) === 0) {
    fwrite(
        STDERR,
        "Usage: php query-nodefinder.php <workspace-root> --queries <path> <file> [<file> ...]\n"
    );
    exit(1);
}

$configurationPath = $parsedArguments['configurationPath'];

try {
    $queryDefinitions = loadNodeFinderQueryDefinitions($configurationPath, $workspaceRoot);
} catch (NodeFinderQueryConfigurationException $exception) {
    fwrite(
        STDERR,
        'Failed to load query configuration: ' . $exception->getMessage() . "\n"
    );
    exit(1);
}

$autoloadPath = resolveAutoloadPath($workspaceRoot, [
    buildAutoloadPathFromRoot(__DIR__ . '/..'),
    buildAutoloadPathFromRoot(dirname(__DIR__, 2)),
]);

require $autoloadPath;

use PhpParser\Error;
use PhpParser\Lexer\Emulative;
use PhpParser\ParserFactory;
use PhpParser\NodeFinder;
use PhpParser\Node;
use PhpParser\Node\Stmt\ClassLike;
use PhpParser\Node\Stmt\Class_;
use PhpParser\Node\Stmt\Enum_;
use PhpParser\Node\Stmt\Property;
use PhpParser\Node\PropertyItem;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Param;
use PhpParser\Node\Expr\ClassConstFetch;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Expr;
use PhpParser\Node\Stmt\Namespace_;
use PhpParser\Node\NullableType;
use PhpParser\Node\UnionType;
use PhpParser\Node\IntersectionType;
use PhpParser\Modifiers;

/**
 * @psalm-type NodeFinderQueryDefinition = array{
 *     key: string,
 *     options: array<string, mixed>
 * }
 */
final class NodeFinderQueryConfigurationException extends RuntimeException
{
}

const NODE_FINDER_QUERY_METADATA = [
    'class.readonly-properties' => [
        'label' => 'Readonly class properties',
        'description' => 'Locate class property declarations that use the readonly modifier.',
    ],
    'constructor.promoted-parameters' => [
        'label' => 'Promoted constructor parameters',
        'description' => 'Locate constructor parameters that promote to class properties.',
    ],
    'enum.case-lookups' => [
        'label' => 'Enum case lookups',
        'description' => 'Locate enum case fetch expressions that reference enums declared in the file.',
    ],
];

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
$finder = new NodeFinder();
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

    $queries = [];

    foreach ($queryDefinitions as $definition) {
        $metadata = NODE_FINDER_QUERY_METADATA[$definition['key']] ?? null;

        if ($metadata === null) {
            fwrite(
                STDERR,
                sprintf('Unknown query key "%s".', $definition['key']) . "\n"
            );
            exit(1);
        }

        $matches = executeNodeFinderQuery(
            $definition['key'],
            $statements,
            $finder,
            $encoderFlags
        );

        $queries[] = [
            'key' => $definition['key'],
            'label' => $metadata['label'],
            'description' => $metadata['description'],
            'matches' => $matches,
            'matchCount' => count($matches),
        ];
    }

    $result = [
        'file' => $file,
        'queries' => $queries,
    ];

    $encoded = json_encode($result, $encoderFlags);
    if ($encoded === false) {
        fwrite(STDERR, "Failed to encode query payload for {$file}: " . json_last_error_msg() . "\n");
        exit(1);
    }

    echo $encoded . "\n";
}

/**
 * @param list<string> $arguments
 * @return array{configurationPath: string|null, files: list<string>}
 */
function parseNodeFinderArguments(array $arguments): array
{
    $configurationPath = null;
    $files = [];

    $length = count($arguments);
    for ($index = 0; $index < $length; $index++) {
        $argument = $arguments[$index];

        if ($argument === '--queries') {
            $index += 1;
            if ($index >= $length) {
                throw new RuntimeException('Missing value for --queries option.');
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
 * @return list<NodeFinderQueryDefinition>
 */
function loadNodeFinderQueryDefinitions(?string $configurationPath, string $workspaceRoot): array
{
    if ($configurationPath === null) {
        throw new NodeFinderQueryConfigurationException(
            'Query configuration path must be provided with the --queries option.'
        );
    }

    $resolvedPath = resolveQueryConfigurationPath($configurationPath, $workspaceRoot);
    $contents = @file_get_contents($resolvedPath);

    if ($contents === false) {
        throw new NodeFinderQueryConfigurationException(
            sprintf('Failed to read configuration file at %s.', $resolvedPath)
        );
    }

    $decoded = json_decode($contents, true);

    if (!is_array($decoded)) {
        throw new NodeFinderQueryConfigurationException('Query configuration must decode to a JSON object.');
    }

    $queries = $decoded['queries'] ?? null;

    if (!is_array($queries)) {
        throw new NodeFinderQueryConfigurationException('Query configuration must declare a "queries" array.');
    }

    if (!array_is_list($queries)) {
        throw new NodeFinderQueryConfigurationException('Query configuration "queries" value must be a list.');
    }

    $definitions = [];

    foreach ($queries as $index => $query) {
        if (!is_array($query)) {
            throw new NodeFinderQueryConfigurationException(
                sprintf('Query definition at index %d must be an object.', $index)
            );
        }

        $key = $query['key'] ?? null;
        if (!is_string($key) || $key === '') {
            throw new NodeFinderQueryConfigurationException(
                sprintf('Query definition at index %d must declare a non-empty "key".', $index)
            );
        }

        $options = $query['options'] ?? [];
        if ($options === null) {
            $options = [];
        }

        if (!is_array($options)) {
            throw new NodeFinderQueryConfigurationException(
                sprintf('Query "%s" must declare options as an object if provided.', $key)
            );
        }

        if ($options !== [] && array_is_list($options)) {
            throw new NodeFinderQueryConfigurationException(
                sprintf('Query "%s" must declare options as an object.', $key)
            );
        }

        /** @var NodeFinderQueryDefinition $definition */
        $definition = [
            'key' => $key,
            'options' => $options,
        ];

        $definitions[] = $definition;
    }

    return $definitions;
}

function resolveQueryConfigurationPath(string $path, string $workspaceRoot): string
{
    $candidate = $path;

    if (!isAbsolutePath($candidate)) {
        $candidate = $workspaceRoot . DIRECTORY_SEPARATOR . $candidate;
    }

    $resolved = realpath($candidate);

    if ($resolved === false) {
        throw new NodeFinderQueryConfigurationException(
            sprintf('Query configuration file did not resolve: %s.', $candidate)
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
 * @return list<array<string, mixed>>
 */
function executeNodeFinderQuery(
    string $key,
    array $statements,
    NodeFinder $finder,
    int $encoderFlags
): array {
    switch ($key) {
        case 'class.readonly-properties':
            return runReadonlyPropertiesQuery($statements, $finder, $encoderFlags);
        case 'constructor.promoted-parameters':
            return runPromotedConstructorParametersQuery($statements, $finder, $encoderFlags);
        case 'enum.case-lookups':
            return runEnumCaseLookupQuery($statements, $finder, $encoderFlags);
        default:
            throw new RuntimeException(sprintf('Unknown query key "%s".', $key));
    }
}

/**
 * @return list<array<string, mixed>>
 */
function runReadonlyPropertiesQuery(
    array $statements,
    NodeFinder $finder,
    int $encoderFlags
): array {
    /** @var list<ClassLike> $classLikes */
    $classLikes = $finder->findInstanceOf($statements, ClassLike::class);
    $matches = [];

    foreach ($classLikes as $classLike) {
        if (!$classLike instanceof Class_) {
            continue;
        }

        $className = resolveClassLikeName($classLike);

        foreach ($classLike->getProperties() as $property) {
            if (!$property->isReadonly()) {
                continue;
            }

            foreach ($property->props as $item) {
                if (!$item instanceof PropertyItem) {
                    continue;
                }

                $matches[] = [
                    'summary' => [
                        'className' => $className,
                        'propertyName' => $item->name->toString(),
                        'visibility' => resolvePropertyVisibility($property),
                        'implicitVisibility' => ($property->flags & Modifiers::VISIBILITY_MASK) === 0,
                        'static' => $property->isStatic(),
                        'type' => describeTypeNode($property->type),
                        'hasDefault' => $item->default !== null,
                    ],
                    'attributes' => normalizeValue($property->getAttributes()),
                    'excerpt' => normaliseNodeToArray($item, $encoderFlags),
                ];
            }
        }
    }

    return $matches;
}

/**
 * @return list<array<string, mixed>>
 */
function runPromotedConstructorParametersQuery(
    array $statements,
    NodeFinder $finder,
    int $encoderFlags
): array {
    /** @var list<ClassLike> $classLikes */
    $classLikes = $finder->findInstanceOf($statements, ClassLike::class);
    $matches = [];

    foreach ($classLikes as $classLike) {
        if (!$classLike instanceof Class_ && !$classLike instanceof Enum_) {
            continue;
        }

        $className = resolveClassLikeName($classLike);
        $constructor = $classLike->getMethod('__construct');

        if (!$constructor instanceof ClassMethod) {
            continue;
        }

        foreach ($constructor->params as $param) {
            if (!$param instanceof Param || !$param->isPromoted()) {
                continue;
            }

            $matches[] = [
                'summary' => [
                    'className' => $className,
                    'parameterName' => resolveParamName($param),
                    'visibility' => resolveParamVisibility($param),
                    'readonly' => $param->isReadonly(),
                    'type' => describeTypeNode($param->type),
                    'hasDefault' => $param->default !== null,
                    'byReference' => $param->byRef,
                    'variadic' => $param->variadic,
                ],
                'attributes' => normalizeValue($param->getAttributes()),
                'excerpt' => normaliseNodeToArray($param, $encoderFlags),
            ];
        }
    }

    return $matches;
}

/**
 * @return list<array<string, mixed>>
 */
function runEnumCaseLookupQuery(
    array $statements,
    NodeFinder $finder,
    int $encoderFlags
): array {
    $enumNames = collectEnumNameCandidates($statements);
    if ($enumNames === []) {
        return [];
    }

    /** @var list<ClassConstFetch> $fetches */
    $fetches = $finder->findInstanceOf($statements, ClassConstFetch::class);
    $matches = [];

    foreach ($fetches as $fetch) {
        if (!$fetch->name instanceof Identifier) {
            continue;
        }

        $caseName = $fetch->name->toString();
        if (strtolower($caseName) === 'class') {
            continue;
        }

        $enumName = resolveClassConstFetchClassName($fetch->class);
        if ($enumName === null) {
            continue;
        }

        if (!in_array($enumName, $enumNames, true)) {
            continue;
        }

        $matches[] = [
            'summary' => [
                'enumName' => $enumName,
                'caseName' => $caseName,
            ],
            'attributes' => normalizeValue($fetch->getAttributes()),
            'excerpt' => normaliseNodeToArray($fetch, $encoderFlags),
        ];
    }

    return $matches;
}

/**
 * @return list<string>
 */
function collectEnumNameCandidates(array $statements, ?string $namespace = null): array
{
    $names = [];

    foreach ($statements as $statement) {
        if ($statement instanceof Namespace_) {
            $namespaceName = $statement->name?->toString();
            $names = array_merge(
                $names,
                collectEnumNameCandidates($statement->stmts, $namespaceName)
            );
            continue;
        }

        if ($statement instanceof Enum_) {
            $baseName = $statement->name?->toString();
            if ($baseName !== null) {
                $names[] = $baseName;
                if ($namespace !== null && $namespace !== '') {
                    $names[] = $namespace . '\\' . $baseName;
                    $names[] = '\\' . $namespace . '\\' . $baseName;
                }
            }
        }

        if ($statement instanceof ClassLike) {
            $names = array_merge(
                $names,
                collectEnumNameCandidates($statement->stmts, $namespace)
            );
        }
    }

    if ($namespace !== null && $namespace === '') {
        $namespace = null;
    }

    if ($names === []) {
        return [];
    }

    /** @var list<string> $unique */
    $unique = array_values(array_unique($names));

    return $unique;
}

function resolveClassConstFetchClassName(Node $class): ?string
{
    if ($class instanceof Name) {
        return $class->toString();
    }

    return null;
}

function resolveClassLikeName(ClassLike $classLike): string
{
    if ($classLike->name !== null) {
        return $classLike->name->toString();
    }

    if ($classLike instanceof Class_ && $classLike->isAnonymous()) {
        return 'anonymous@' . $classLike->getStartLine();
    }

    return 'anonymous';
}

function resolvePropertyVisibility(Property $property): string
{
    if (($property->flags & Modifiers::VISIBILITY_MASK) === 0) {
        return 'public';
    }

    if ($property->isPublic()) {
        return 'public';
    }

    if ($property->isProtected()) {
        return 'protected';
    }

    if ($property->isPrivate()) {
        return 'private';
    }

    return 'unknown';
}

function resolveParamName(Param $param): string
{
    if ($param->var instanceof Expr\Variable) {
        $name = $param->var->name;
        if (is_string($name)) {
            return '$' . $name;
        }
    }

    return '$unknown';
}

function resolveParamVisibility(Param $param): string
{
    if ($param->isPublic()) {
        return 'public';
    }

    if ($param->isProtected()) {
        return 'protected';
    }

    if ($param->isPrivate()) {
        return 'private';
    }

    return 'default';
}

function describeTypeNode(?Node $type): ?string
{
    if ($type === null) {
        return null;
    }

    if ($type instanceof Identifier || $type instanceof Name) {
        return $type->toString();
    }

    if ($type instanceof NullableType) {
        $inner = describeTypeNode($type->type);
        return $inner === null ? null : '?' . $inner;
    }

    if ($type instanceof UnionType) {
        $parts = [];
        foreach ($type->types as $inner) {
            $description = describeTypeNode($inner);
            if ($description !== null && $description !== '') {
                $parts[] = $description;
            }
        }

        return $parts === [] ? null : implode('|', $parts);
    }

    if ($type instanceof IntersectionType) {
        $parts = [];
        foreach ($type->types as $inner) {
            $description = describeTypeNode($inner);
            if ($description !== null && $description !== '') {
                $parts[] = $description;
            }
        }

        return $parts === [] ? null : implode('&', $parts);
    }

    return null;
}

/**
 * @return array<string, mixed>
 */
function normaliseNodeToArray(Node $node, int $encoderFlags): array
{
    $encoded = json_encode($node, $encoderFlags);
    if ($encoded === false) {
        throw new RuntimeException('Failed to encode node: ' . json_last_error_msg());
    }

    $decoded = json_decode($encoded, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Encoded node payload did not decode to an array.');
    }

    $normalised = normalizeValue($decoded);
    if (!is_array($normalised)) {
        throw new RuntimeException('Normalised node payload was not an array.');
    }

    /** @var array<string, mixed> $normalised */
    return $normalised;
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
