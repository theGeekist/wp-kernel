<?php

declare(strict_types=1);

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

set_error_handler(
    static function (int $severity, string $message, string $file = '', int $line = 0): bool {
        if (($severity & (E_DEPRECATED | E_USER_DEPRECATED)) === 0) {
            return false;
        }

        $location = $file !== '' ? " in {$file}" : '';
        $lineInfo = $line > 0 ? " on line {$line}" : '';
        fwrite(STDERR, "Deprecated: {$message}{$location}{$lineInfo}\n");

        return true;
    }
);

if ($argc < 3) {
    fwrite(STDERR, "Usage: php pretty-print.php <workspace-root> <file>\n");
    exit(1);
}

$workspaceRoot = $argv[1];
$targetFile = $argv[2];
$traceFile = resolveTraceFilePath();
$autoloadPath = resolveAutoloadPath($workspaceRoot, [
    buildAutoloadPathFromRoot(
        dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'cli'
    ),
    buildAutoloadPathFromRoot(
        dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'php-json-ast'
    ),
    buildAutoloadPathFromRoot(__DIR__ . '/..'),
    buildAutoloadPathFromRoot(dirname(__DIR__, 2)),
]);

require $autoloadPath;

recordTrace($traceFile, [
    'event' => 'start',
    'targetFile' => $targetFile,
    'autoloadPath' => $autoloadPath,
]);

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
$output = normalizeDeclareSpacing($printer->prettyPrintFile($statements));

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

recordTrace($traceFile, [
    'event' => 'success',
    'targetFile' => $targetFile,
]);

echo $resultJson . "\n";

function ensureTrailingNewline(string $value): string
{
    return str_ends_with($value, "\n") ? $value : $value . "\n";
}

function normalizeDeclareSpacing(string $value): string
{
    $normalized = preg_replace('/\bdeclare\s+\(/', 'declare(', $value);
    return is_string($normalized) ? $normalized : $value;
}

/**
 * @param list<string> $additionalCandidates
 */
function resolveAutoloadPath(string $workspaceRoot, array $additionalCandidates = []): string
{
    $candidates = array_merge(
        [buildAutoloadPathFromRoot($workspaceRoot)],
        buildAutoloadCandidatesFromEnv(),
        $additionalCandidates,
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

/**
 * @return string|null
 */
function resolveTraceFilePath(): ?string
{
    $value = getenv('PHP_DRIVER_TRACE_FILE');
    if (!is_string($value) || $value === '') {
        return null;
    }

    return $value;
}

/**
 * @param array<string, mixed> $payload
 */
function recordTrace(?string $traceFile, array $payload): void
{
    if ($traceFile === null) {
        return;
    }

    $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        return;
    }

    file_put_contents($traceFile, $encoded . PHP_EOL, FILE_APPEND);
}
