<?php

declare(strict_types=1);

namespace WPKernel\Showcase\Admin;

use function add_menu_page;

function register_jobsadminscreen(): void
{
    add_menu_page(
        "Jobs",
        "Jobs",
        "manage_options",
        "wpk-jobs",
        function (): void {
            echo '<div id="wpk-jobs-app"></div>';
        },
        "",
        null,
    );
}
