<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use PhpParser\NodeAbstract;

$input = stream_get_contents(STDIN);
if ($input === false) {
    fwrite(STDERR, "Failed to read node type list from STDIN.\n");
    exit(1);
}

try {
    $nodeTypes = json_decode($input, true);
    if (!is_array($nodeTypes)) {
        fwrite(STDERR, "Expected JSON array of node types.\n");
        exit(1);
    }

    $nodeDir = __DIR__ . '/../vendor/nikic/php-parser/lib/PhpParser/Node';
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($nodeDir)
    );

    $nodeMap = [];

    /** @var SplFileInfo $file */
    foreach ($iterator as $file) {
        if (!$file->isFile() || $file->getExtension() !== 'php') {
            continue;
        }

        $relative = substr($file->getPathname(), strlen($nodeDir) + 1);
        $class = 'PhpParser\\Node\\' . str_replace(DIRECTORY_SEPARATOR, '\\', substr($relative, 0, -4));

        if (!class_exists($class)) {
            continue;
        }

        $reflection = new ReflectionClass($class);
        if (!$reflection->isSubclassOf(NodeAbstract::class) || $reflection->isAbstract()) {
            continue;
        }

        $instance = $reflection->newInstanceWithoutConstructor();
        $type = $instance->getType();

        if (!is_string($type) || $type === '') {
            continue;
        }

        $nodeMap[$type] = [
            'class' => $class,
            'subNodeNames' => $instance->getSubNodeNames(),
        ];
    }

    $result = [];

    foreach ($nodeTypes as $nodeType) {
        if (!is_string($nodeType)) {
            continue;
        }

        if (isset($nodeMap[$nodeType])) {
            $result[$nodeType] = $nodeMap[$nodeType];
        }
    }

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'Reflection failure: ' . $error->getMessage() . "\n");
    exit(1);
}
