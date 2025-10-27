<?php

declare(strict_types=1);

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

if ($argc < 3) {
    fwrite(STDERR, "Usage: php ingest-program.php <workspace-root> <file> [<file> ...]\n");
    exit(1);
}

$workspaceRoot = $argv[1];
$files = array_slice($argv, 2);

$autoloadPath = rtrim($workspaceRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';

if (!is_file($autoloadPath)) {
    fwrite(STDERR, "Composer autoload not found at {$autoloadPath}.\n");
    exit(1);
}

require $autoloadPath;

use PhpParser\Error;
use PhpParser\Lexer\Emulative;
use PhpParser\ParserFactory;

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
