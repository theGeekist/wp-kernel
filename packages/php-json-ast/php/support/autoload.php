<?php

declare(strict_types=1);

/**
 * Resolve the Composer autoload path using the provided workspace root.
 *
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
