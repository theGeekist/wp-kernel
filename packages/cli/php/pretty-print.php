<?php

declare(strict_types=1);

if ($argc < 3) {
    fwrite(STDERR, "Usage: php pretty-print.php <workspace-root> <file>\n");
    exit(1);
}

$workspaceRoot = $argv[1];
$targetFile = $argv[2];
$autoloadPath = $workspaceRoot . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';

if (!is_file($autoloadPath)) {
    fwrite(STDERR, "Composer autoload not found at {$autoloadPath}.\n");
    exit(1);
}

require $autoloadPath;

use PhpParser\Error;
use PhpParser\JsonDecoder;
use PhpParser\ParserFactory;
use PhpParser\PrettyPrinter\Standard;

$rawInput = stream_get_contents(STDIN);

if ($rawInput === false) {
    fwrite(STDERR, "Failed to read AST payload for {$targetFile}.\n");
    exit(1);
}

$payload = json_decode($rawInput, true);

if (!is_array($payload)) {
    fwrite(STDERR, "Invalid payload: expected JSON object for {$targetFile}.\n");
    exit(1);
}

$statements = null;
$decoder = new JsonDecoder();
$astPayload = $payload['ast'] ?? null;
$legacyAst = $payload['legacyAst'] ?? null;

if (is_string($astPayload) || is_array($astPayload)) {
    $astJson = is_string($astPayload) ? $astPayload : json_encode($astPayload);
    if ($astJson === false) {
        fwrite(STDERR, "Failed to encode AST payload for {$targetFile}.\n");
        exit(1);
    }

    try {
        $decoded = $decoder->decode($astJson);
        if (!is_array($decoded)) {
            fwrite(STDERR, "Decoded AST payload did not yield statements for {$targetFile}.\n");
            exit(1);
        }

        $statements = $decoded;
    } catch (Error $error) {
        fwrite(
            STDERR,
            "Failed to decode AST payload for {$targetFile}: {$error->getMessage()}\n"
        );
        exit(1);
    }
}

$codeFromLegacyAst = null;
if ($legacyAst !== null) {
    if (!is_array($legacyAst)) {
        fwrite(STDERR, "Invalid legacy AST payload for {$targetFile}.\n");
        exit(1);
    }

    $codeFromLegacyAst = buildCodeFromLegacyAst($legacyAst);
}

$codeFromPayload = null;
if (isset($payload['code']) && is_string($payload['code'])) {
    $codeFromPayload = $payload['code'];
}

$debugPath = getenv('WPK_PHP_PRINTER_DEBUG');
if (is_string($debugPath) && $debugPath !== '') {
    $debugSource = $codeFromPayload ?? $codeFromLegacyAst;
    if (is_string($debugSource)) {
        file_put_contents($debugPath, $debugSource);
    }
}

if ($statements === null) {
    $sourceCode = $codeFromPayload ?? $codeFromLegacyAst;

    if (!is_string($sourceCode) || $sourceCode === '') {
        fwrite(STDERR, "No PHP source provided for {$targetFile}.\n");
        exit(1);
    }

    $parser = (new ParserFactory())->createForNewestSupportedVersion();

    try {
        $statements = $parser->parse($sourceCode);
    } catch (Error $error) {
        fwrite(STDERR, "Failed to parse generated PHP for {$targetFile}: {$error->getMessage()}\n");
        exit(1);
    }

    if ($statements === null) {
        fwrite(STDERR, "Parser returned null statements for {$targetFile}.\n");
        exit(1);
    }

    if ($codeFromPayload !== null && $codeFromLegacyAst !== null) {
        if (normaliseWhitespace($codeFromPayload) !== normaliseWhitespace($codeFromLegacyAst)) {
            fwrite(STDERR, "Legacy AST payload did not match provided code for {$targetFile}.\n");
            exit(1);
        }
    }
}

$printer = new Standard();
$output = $printer->prettyPrintFile($statements);

$encoderFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
$astJson = json_encode($statements, $encoderFlags);

if ($astJson === false) {
    fwrite(STDERR, "Failed to encode AST for {$targetFile}: " . json_last_error_msg() . "\n");
    exit(1);
}

$astPayload = json_decode($astJson, true);

if (!is_array($astPayload)) {
    fwrite(STDERR, "Failed to decode AST payload for {$targetFile}.\n");
    exit(1);
}

$result = [
    'code' => ensureTrailingNewline($output),
    'ast' => $astPayload,
];

$resultJson = json_encode($result, $encoderFlags);

if ($resultJson === false) {
    fwrite(STDERR, "Failed to encode printer result for {$targetFile}.\n");
    exit(1);
}

echo $resultJson . "\n";

/**
 * @param array{namespace?: string, docblock?: array<int, string>, uses?: array<int, string>, statements?: array<int, string>} $ast
 */
function buildCodeFromLegacyAst(array $ast): string
{
    $lines = ['<?php', 'declare(strict_types=1);', ''];

    $docblock = $ast['docblock'] ?? [];
    if (is_array($docblock) && count($docblock) > 0) {
        $lines[] = '/**';
        foreach ($docblock as $line) {
            $lines[] = ' * ' . rtrim((string) $line);
        }
        $lines[] = ' */';
        $lines[] = '';
    }

    $namespace = isset($ast['namespace']) ? normaliseNamespace((string) $ast['namespace']) : '';
    if ($namespace !== '') {
        $lines[] = 'namespace ' . $namespace . ';';
        $lines[] = '';
    }

    $uses = $ast['uses'] ?? [];
    if (is_array($uses) && count($uses) > 0) {
        foreach ($uses as $use) {
            $lines[] = 'use ' . normaliseNamespace((string) $use) . ';';
        }
        $lines[] = '';
    }

    $lines[] = '// WPK:BEGIN AUTO';

    $statements = $ast['statements'] ?? [];
    if (is_array($statements)) {
        foreach ($statements as $statement) {
            $lines[] = (string) $statement;
        }
    }

    $lines[] = '// WPK:END AUTO';
    $lines[] = '';

    return implode("\n", $lines);
}

function ensureTrailingNewline(string $value): string
{
    return str_ends_with($value, "\n") ? $value : $value . "\n";
}

function normaliseWhitespace(string $value): string
{
    return trim(str_replace(["\r\n", "\r"], "\n", $value));
}

function normaliseNamespace(string $value): string
{
    return trim(str_replace('\\\\', '\\', $value));
}
