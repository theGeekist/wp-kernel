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

$decoder = new JsonDecoder();
$astPayload = $payload['ast'] ?? null;

if (!is_string($astPayload) && !is_array($astPayload)) {
    fwrite(STDERR, "AST payload missing for {$targetFile}.\n");
    exit(1);
}

$astJson = is_string($astPayload) ? $astPayload : json_encode($astPayload);
if ($astJson === false) {
    fwrite(STDERR, "Failed to encode AST payload for {$targetFile}.\n");
    exit(1);
}

try {
    $statements = $decoder->decode($astJson);
    if (!is_array($statements)) {
        fwrite(STDERR, "Decoded AST payload did not yield statements for {$targetFile}.\n");
        exit(1);
    }
} catch (Error $error) {
    fwrite(
        STDERR,
        "Failed to decode AST payload for {$targetFile}: {$error->getMessage()}\n"
    );
    exit(1);
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

function ensureTrailingNewline(string $value): string
{
    return str_ends_with($value, "\n") ? $value : $value . "\n";
}
