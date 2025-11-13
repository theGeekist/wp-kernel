<?php

declare(strict_types=1);

/**
 * Resolve the Composer autoload path using the provided workspace root.
 *
 * @param list<string> $additionalCandidates
 */
function resolveAutoloadPath(string $workspaceRoot, array $additionalCandidates = []): string
{
    $candidates = buildAutoloadCandidateList($workspaceRoot, $additionalCandidates);

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

/**
 * @param list<string> $additionalCandidates
 */
function loadAutoloadPathWithPhpParser(
    string $workspaceRoot,
    array $additionalCandidates = []
): string {
    return loadAutoloadPathForClasses(
        $workspaceRoot,
        $additionalCandidates,
        [
            \PhpParser\ParserFactory::class,
            \PhpParser\JsonDecoder::class,
        ]
    );
}

/**
 * @param list<string> $additionalCandidates
 * @param list<class-string> $requiredClasses
 */
function loadAutoloadPathForClasses(
    string $workspaceRoot,
    array $additionalCandidates,
    array $requiredClasses
): string {
    $candidates = buildAutoloadCandidateList(
        $workspaceRoot,
        $additionalCandidates
    );
    $missing = [];

    foreach ($candidates as $candidate) {
        if (!is_file($candidate)) {
            $missing[] = $candidate;
            continue;
        }

        require_once $candidate;
        $unresolved = array_filter(
            $requiredClasses,
            static fn(string $class): bool => !class_exists($class, true)
        );

        if ($unresolved === []) {
            return $candidate;
        }

        $missing[] = $candidate;
    }

    fwrite(STDERR, "Required Composer classes were not found. Checked:\n");
    foreach ($missing as $candidate) {
        fwrite(STDERR, " - {$candidate}\n");
    }

    exit(1);
}

/**
 * @param list<string> $additionalCandidates
 * @return list<string>
 */
function buildAutoloadCandidateList(
    string $workspaceRoot,
    array $additionalCandidates
): array {
    $candidates = array_merge(
        [buildAutoloadPathFromRoot($workspaceRoot)],
        $additionalCandidates,
        buildAutoloadCandidatesFromEnv()
    );

    return array_values(
        array_unique(
            array_filter(
                $candidates,
                static fn(string $candidate): bool => $candidate !== ''
            )
        )
    );
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
    $paths = getenv('WPK_PHP_AUTOLOAD_PATHS');
    if (!is_string($paths) || $paths === '') {
        $paths = getenv('PHP_DRIVER_AUTOLOAD_PATHS');
    }

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
