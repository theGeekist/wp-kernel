<?php

declare(strict_types=1);
namespace Fixtures\Codemod;

use Project\Contracts\FooInterface;
use Project\Helpers\ArrayHelper;
use Project\Helpers\bbb;
use Project\Helpers\Group\{Alpha, Beta as BetaAlias};
use function Project\Helpers\build_helper;
use function Project\Helpers\render_view;
use const Project\Constants\AnotherConstant;
use const Project\Constants\GlobalConstant;
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
