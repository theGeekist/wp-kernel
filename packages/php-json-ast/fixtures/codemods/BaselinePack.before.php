<?php

declare(strict_types=1);

namespace Fixtures\Codemod;

use Project\Helpers\ArrayHelper;
use Project\Contracts\FooInterface;
use const Project\Constants\GlobalConstant;
use function Project\Helpers\render_view;
use Project\Helpers\bbb;
use Project\Helpers\Group\{ Beta as BetaAlias, Alpha };
use function Project\Helpers\build_helper;
use const Project\Constants\AnotherConstant;

final class BaselinePackExample
{
    public function run(): void
    {
        render_view('example');
        build_helper();

        $value = GlobalConstant;
        $helper = new ArrayHelper();
        $helper->handle(FooInterface::class);
        $helper->withAlias(new bbb());
        $helper->group(BetaAlias::class, Alpha::class, AnotherConstant);

        echo $value;
    }
}
