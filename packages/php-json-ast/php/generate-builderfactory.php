<?php

declare(strict_types=1);

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

require_once __DIR__ . '/support/autoload.php';

if ($argc < 3) {
    fwrite(
        STDERR,
        "Usage: php generate-builderfactory.php <workspace-root> --intent <path>\n"
    );
    exit(1);
}

$workspaceRoot = $argv[1];

try {
    $parsed = parseBuilderFactoryArguments(array_slice($argv, 2));
} catch (RuntimeException $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

$intentPath = $parsed['intentPath'];

if ($intentPath === null) {
    fwrite(
        STDERR,
        "Usage: php generate-builderfactory.php <workspace-root> --intent <path>\n"
    );
    exit(1);
}

try {
    $resolvedIntentPath = resolveIntentPath($intentPath, $workspaceRoot);
} catch (RuntimeException $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

$autoloadPath = resolveAutoloadPath($workspaceRoot, [
    buildAutoloadPathFromRoot(__DIR__ . '/..'),
    buildAutoloadPathFromRoot(dirname(__DIR__, 2)),
]);

require $autoloadPath;

use PhpParser\BuilderFactory;
use PhpParser\Node\DeclareItem;
use PhpParser\Node\Expr\Assign;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Stmt;
use PhpParser\Node\Stmt\Declare_;
use PhpParser\Node\Stmt\Expression;
use PhpParser\Node\Stmt\Return_;

try {
    $intent = loadBuilderFactoryIntent($resolvedIntentPath);
} catch (RuntimeException $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

$factory = new BuilderFactory();

foreach ($intent['files'] as $fileIntent) {
    $program = buildProgramFromIntent($factory, $fileIntent);

    $result = [
        'file' => $fileIntent['file'],
        'program' => $program,
    ];

    $encoded = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        fwrite(
            STDERR,
            'Failed to encode builder factory output: ' . json_last_error_msg() . "\n"
        );
        exit(1);
    }

    echo $encoded . "\n";
}

/**
 * @param list<string> $arguments
 * @return array{intentPath: string|null}
 */
function parseBuilderFactoryArguments(array $arguments): array
{
    $intentPath = null;

    while (count($arguments) > 0) {
        $argument = array_shift($arguments);

        if ($argument === '--intent') {
            if ($intentPath !== null) {
                throw new RuntimeException('Only one --intent argument may be provided.');
            }

            $value = array_shift($arguments);
            if (!is_string($value)) {
                throw new RuntimeException('Missing value for --intent argument.');
            }

            $intentPath = $value;
            continue;
        }

        throw new RuntimeException(sprintf('Unknown argument "%s".', $argument));
    }

    return ['intentPath' => $intentPath];
}

function resolveIntentPath(string $path, string $workspaceRoot): string
{
    $candidate = $path;
    if (!isAbsolutePath($candidate)) {
        $candidate = $workspaceRoot . DIRECTORY_SEPARATOR . $candidate;
    }

    $resolved = realpath($candidate);
    if ($resolved === false) {
        throw new RuntimeException(
            sprintf('BuilderFactory intent file did not resolve: %s.', $candidate)
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
 * @return array{files: list<array<string, mixed>>}
 */
function loadBuilderFactoryIntent(string $path): array
{
    $contents = @file_get_contents($path);
    if ($contents === false) {
        throw new RuntimeException(sprintf('Failed to read builder factory intent: %s.', $path));
    }

    $decoded = json_decode($contents, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Builder factory intent must decode to an object.');
    }

    if (!isset($decoded['files']) || !is_array($decoded['files']) || !array_is_list($decoded['files'])) {
        throw new RuntimeException('Builder factory intent must declare a "files" array.');
    }

    return $decoded;
}

/**
 * @param array<string, mixed> $fileIntent
 * @return list<Stmt>
 */
function buildProgramFromIntent(BuilderFactory $factory, array $fileIntent): array
{
    if (!isset($fileIntent['namespace']) || !is_array($fileIntent['namespace'])) {
        throw new RuntimeException('Namespace configuration must be provided for each file intent.');
    }

    if (!isset($fileIntent['class']) || !is_array($fileIntent['class'])) {
        throw new RuntimeException('Class configuration must be provided for each file intent.');
    }

    $namespaceIntent = $fileIntent['namespace'];
    $classIntent = $fileIntent['class'];
    $useIntents = [];

    if (isset($fileIntent['uses'])) {
        if (!is_array($fileIntent['uses']) || !array_is_list($fileIntent['uses'])) {
            throw new RuntimeException('Namespace uses must be declared as an array.');
        }

        $useIntents = $fileIntent['uses'];
    }

    $program = [];
    $program[] = createStrictTypesDeclare($factory);
    $program[] = buildNamespaceFromIntent($factory, $namespaceIntent, $useIntents, $classIntent);

    return $program;
}

/**
 * @param array<string, mixed> $namespaceIntent
 * @param list<array<string, mixed>> $useIntents
 * @param array<string, mixed> $classIntent
 */
function buildNamespaceFromIntent(
    BuilderFactory $factory,
    array $namespaceIntent,
    array $useIntents,
    array $classIntent
): Stmt\Namespace_ {
    if (!isset($namespaceIntent['name']) || !is_string($namespaceIntent['name'])) {
        throw new RuntimeException('Namespace intent must declare a "name" string.');
    }

    $namespaceBuilder = $factory->namespace($namespaceIntent['name']);

    if (isset($namespaceIntent['docblock'])) {
        $namespaceBuilder->setDocComment(formatDocCommentLines($namespaceIntent['docblock']));
    }

    foreach ($useIntents as $useIntent) {
        if (!is_array($useIntent)) {
            throw new RuntimeException('Each namespace use intent must be an object.');
        }

        $namespaceBuilder->addStmt(createUseFromIntent($factory, $useIntent));
    }

    $namespaceBuilder->addStmt(buildClassFromIntent($factory, $classIntent));

    return $namespaceBuilder->getNode();
}

/**
 * @param array<string, mixed> $classIntent
 */
function buildClassFromIntent(BuilderFactory $factory, array $classIntent): Stmt\Class_
{
    if (!isset($classIntent['name']) || !is_string($classIntent['name'])) {
        throw new RuntimeException('Class intent must declare a "name" string.');
    }

    $classBuilder = $factory->class($classIntent['name']);

    if (!empty($classIntent['isFinal'])) {
        $classBuilder->makeFinal();
    }

    if (!empty($classIntent['isAbstract'])) {
        $classBuilder->makeAbstract();
    }

    if (array_key_exists('extends', $classIntent) && $classIntent['extends'] !== null) {
        if (!is_string($classIntent['extends'])) {
            throw new RuntimeException('Class "extends" value must be a string or null.');
        }

        $classBuilder->extend($classIntent['extends']);
    }

    if (isset($classIntent['implements'])) {
        if (!is_array($classIntent['implements']) || !array_is_list($classIntent['implements'])) {
            throw new RuntimeException('Class "implements" configuration must be an array.');
        }

        foreach ($classIntent['implements'] as $interface) {
            if (!is_string($interface)) {
                throw new RuntimeException('Interface names must be strings.');
            }

            $classBuilder->implement($interface);
        }
    }

    if (isset($classIntent['docblock'])) {
        $classBuilder->setDocComment(formatDocCommentLines($classIntent['docblock']));
    }

    if (isset($classIntent['properties'])) {
        if (!is_array($classIntent['properties']) || !array_is_list($classIntent['properties'])) {
            throw new RuntimeException('Class properties must be declared as an array.');
        }

        foreach ($classIntent['properties'] as $propertyIntent) {
            if (!is_array($propertyIntent)) {
                throw new RuntimeException('Each property intent must be an object.');
            }

            $classBuilder->addStmt(createPropertyFromIntent($factory, $propertyIntent));
        }
    }

    if (isset($classIntent['methods'])) {
        if (!is_array($classIntent['methods']) || !array_is_list($classIntent['methods'])) {
            throw new RuntimeException('Class methods must be declared as an array.');
        }

        foreach ($classIntent['methods'] as $methodIntent) {
            if (!is_array($methodIntent)) {
                throw new RuntimeException('Each method intent must be an object.');
            }

            $classBuilder->addStmt(createMethodFromIntent($factory, $methodIntent));
        }
    }

    return $classBuilder->getNode();
}

/**
 * @param array<string, mixed> $useIntent
 */
function createUseFromIntent(BuilderFactory $factory, array $useIntent): Stmt\Use_
{
    if (!isset($useIntent['name']) || !is_string($useIntent['name'])) {
        throw new RuntimeException('Use intent must declare a "name" string.');
    }

    $kind = $useIntent['kind'] ?? 'normal';

    switch ($kind) {
        case 'normal':
            $builder = $factory->use($useIntent['name']);
            break;
        case 'function':
            $builder = $factory->useFunction($useIntent['name']);
            break;
        case 'const':
            $builder = $factory->useConst($useIntent['name']);
            break;
        default:
            throw new RuntimeException(sprintf('Unknown use kind "%s".', (string) $kind));
    }

    if (array_key_exists('alias', $useIntent) && is_string($useIntent['alias']) && $useIntent['alias'] !== '') {
        $builder->as($useIntent['alias']);
    }

    return $builder->getNode();
}

/**
 * @param array<string, mixed> $propertyIntent
 */
function createPropertyFromIntent(BuilderFactory $factory, array $propertyIntent): Stmt\Property
{
    if (!isset($propertyIntent['name']) || !is_string($propertyIntent['name'])) {
        throw new RuntimeException('Property intent must declare a "name" string.');
    }

    $propertyBuilder = $factory->property($propertyIntent['name']);
    applyVisibilityToBuilder($propertyBuilder, $propertyIntent['visibility'] ?? 'public');

    if (!empty($propertyIntent['isStatic'])) {
        $propertyBuilder->makeStatic();
    }

    if (!empty($propertyIntent['isReadonly'])) {
        $propertyBuilder->makeReadonly();
    }

    if (array_key_exists('type', $propertyIntent) && $propertyIntent['type'] !== null) {
        if (!is_string($propertyIntent['type'])) {
            throw new RuntimeException('Property type must be a string or null.');
        }

        $propertyBuilder->setType($propertyIntent['type']);
    }

    if (array_key_exists('default', $propertyIntent)) {
        if (!is_array($propertyIntent['default'])) {
            throw new RuntimeException('Property default must be declared as a literal object.');
        }

        $propertyBuilder->setDefault(normaliseLiteralValue($factory, $propertyIntent['default']));
    }

    if (isset($propertyIntent['docblock'])) {
        $propertyBuilder->setDocComment(formatDocCommentLines($propertyIntent['docblock']));
    }

    return $propertyBuilder->getNode();
}

/**
 * @param array<string, mixed> $methodIntent
 */
function createMethodFromIntent(BuilderFactory $factory, array $methodIntent): Stmt\ClassMethod
{
    if (!isset($methodIntent['name']) || !is_string($methodIntent['name'])) {
        throw new RuntimeException('Method intent must declare a "name" string.');
    }

    $methodBuilder = $factory->method($methodIntent['name']);
    applyVisibilityToBuilder($methodBuilder, $methodIntent['visibility'] ?? 'public');

    if (!empty($methodIntent['isStatic'])) {
        $methodBuilder->makeStatic();
    }

    if (array_key_exists('returnType', $methodIntent)) {
        $returnType = $methodIntent['returnType'];
        if ($returnType !== null) {
            if (!is_string($returnType)) {
                throw new RuntimeException('Method return type must be a string or null.');
            }

            $methodBuilder->setReturnType($returnType);
        }
    }

    if (isset($methodIntent['parameters'])) {
        if (!is_array($methodIntent['parameters']) || !array_is_list($methodIntent['parameters'])) {
            throw new RuntimeException('Method parameters must be declared as an array.');
        }

        foreach ($methodIntent['parameters'] as $parameterIntent) {
            if (!is_array($parameterIntent)) {
                throw new RuntimeException('Each parameter intent must be an object.');
            }

            $methodBuilder->addParam(createParameterFromIntent($factory, $parameterIntent));
        }
    }

    if (isset($methodIntent['docblock'])) {
        $methodBuilder->setDocComment(formatDocCommentLines($methodIntent['docblock']));
    }

    $steps = $methodIntent['body'] ?? [];
    if (!is_array($steps)) {
        throw new RuntimeException('Method body must be declared as an array of steps.');
    }

    foreach ($steps as $step) {
        if (!is_array($step)) {
            throw new RuntimeException('Each method body step must be an object.');
        }

        foreach (createMethodStatementsFromStep($factory, $step) as $statement) {
            $methodBuilder->addStmt($statement);
        }
    }

    return $methodBuilder->getNode();
}

/**
 * @param array<string, mixed> $parameterIntent
 */
function createParameterFromIntent(BuilderFactory $factory, array $parameterIntent): \PhpParser\Node\Param
{
    if (!isset($parameterIntent['name']) || !is_string($parameterIntent['name'])) {
        throw new RuntimeException('Parameter intent must declare a "name" string.');
    }

    $parameterBuilder = $factory->param($parameterIntent['name']);

    if (array_key_exists('type', $parameterIntent) && $parameterIntent['type'] !== null) {
        if (!is_string($parameterIntent['type'])) {
            throw new RuntimeException('Parameter type must be a string or null.');
        }

        $parameterBuilder->setType($parameterIntent['type']);
    }

    if (array_key_exists('default', $parameterIntent)) {
        if (!is_array($parameterIntent['default'])) {
            throw new RuntimeException('Parameter default must be declared as a literal object.');
        }

        $parameterBuilder->setDefault(normaliseLiteralValue($factory, $parameterIntent['default']));
    }

    return $parameterBuilder->getNode();
}

/**
 * @param array<string, mixed> $step
 * @return list<Stmt>
 */
function createMethodStatementsFromStep(BuilderFactory $factory, array $step): array
{
    if (!isset($step['kind'])) {
        throw new RuntimeException('Method step must declare a "kind".');
    }

    switch ($step['kind']) {
        case 'assignPropertyFromParameter':
            return [createAssignmentStatement($factory, $step)];
        case 'returnProperty':
            return [createReturnPropertyStatement($factory, $step)];
        case 'returnNew':
            return [createReturnNewStatement($factory, $step)];
        default:
            throw new RuntimeException(sprintf('Unsupported method step "%s".', (string) $step['kind']));
    }
}

/**
 * @param array<string, mixed> $step
 */
function createAssignmentStatement(BuilderFactory $factory, array $step): Stmt
{
    if (!isset($step['property'], $step['parameter'])) {
        throw new RuntimeException('Assignment step requires "property" and "parameter" fields.');
    }

    if (!is_string($step['property']) || !is_string($step['parameter'])) {
        throw new RuntimeException('Assignment step properties must be strings.');
    }

    $propertyFetch = $factory->propertyFetch($factory->var('this'), $step['property']);
    $assign = new Assign($propertyFetch, $factory->var($step['parameter']));

    return new Expression($assign);
}

/**
 * @param array<string, mixed> $step
 */
function createReturnPropertyStatement(BuilderFactory $factory, array $step): Stmt
{
    if (!isset($step['property']) || !is_string($step['property'])) {
        throw new RuntimeException('Return property step must declare a string "property" field.');
    }

    $propertyFetch = $factory->propertyFetch($factory->var('this'), $step['property']);

    return new Return_($propertyFetch);
}

/**
 * @param array<string, mixed> $step
 */
function createReturnNewStatement(BuilderFactory $factory, array $step): Stmt
{
    if (!isset($step['className']) || !is_string($step['className'])) {
        throw new RuntimeException('Return new step must declare a "className" string.');
    }

    $args = [];
    if (isset($step['arguments'])) {
        if (!is_array($step['arguments']) || !array_is_list($step['arguments'])) {
            throw new RuntimeException('Return new arguments must be declared as an array.');
        }

        foreach ($step['arguments'] as $argument) {
            if (!is_array($argument)) {
                throw new RuntimeException('Return new arguments must be objects.');
            }

            $args[] = normaliseMethodArgument($factory, $argument);
        }
    }

    return new Return_($factory->new($step['className'], $args));
}

/**
 * @param array<string, mixed> $argument
 * @return mixed
 */
function normaliseMethodArgument(BuilderFactory $factory, array $argument)
{
    if (!isset($argument['kind'])) {
        throw new RuntimeException('Method argument must declare a "kind" field.');
    }

    switch ($argument['kind']) {
        case 'parameter':
            if (!isset($argument['name']) || !is_string($argument['name'])) {
                throw new RuntimeException('Parameter arguments must declare a "name" string.');
            }

            return $factory->var($argument['name']);
        case 'literal':
            if (!isset($argument['literal']) || !is_array($argument['literal'])) {
                throw new RuntimeException('Literal arguments must declare a "literal" object.');
            }

            return normaliseLiteralValue($factory, $argument['literal']);
        default:
            throw new RuntimeException(sprintf('Unknown argument kind "%s".', (string) $argument['kind']));
    }
}

function applyVisibilityToBuilder(object $builder, string $visibility): void
{
    switch ($visibility) {
        case 'public':
            $builder->makePublic();
            break;
        case 'protected':
            $builder->makeProtected();
            break;
        case 'private':
            $builder->makePrivate();
            break;
        default:
            throw new RuntimeException(sprintf('Unknown visibility "%s".', $visibility));
    }
}

function normaliseLiteralValue(BuilderFactory $factory, array $literal)
{
    if (!isset($literal['kind'])) {
        throw new RuntimeException('Literal configuration must declare a "kind".');
    }

    switch ($literal['kind']) {
        case 'string':
        case 'int':
        case 'float':
        case 'bool':
            if (!array_key_exists('value', $literal)) {
                throw new RuntimeException('Literal objects must declare a "value".');
            }

            return $literal['value'];
        case 'null':
            return null;
        default:
            throw new RuntimeException(sprintf('Unsupported literal kind "%s".', (string) $literal['kind']));
    }
}

function formatDocCommentLines(mixed $lines): string
{
    if (!is_array($lines) || !array_is_list($lines)) {
        throw new RuntimeException('Docblock lines must be declared as an array.');
    }

    if (count($lines) === 0) {
        return '/** */';
    }

    $trimmed = array_map(
        static fn($line) => rtrim(is_string($line) ? $line : ''),
        $lines
    );

    if (count($trimmed) === 1) {
        return '/** ' . $trimmed[0] . ' */';
    }

    $body = array_map(static fn(string $line): string => ' * ' . $line, $trimmed);

    return "/**\n" . implode("\n", $body) . "\n */";
}

function createStrictTypesDeclare(BuilderFactory $factory): Declare_
{
    $declare = new DeclareItem('strict_types', $factory->val(1));
    return new Declare_([$declare]);
}
