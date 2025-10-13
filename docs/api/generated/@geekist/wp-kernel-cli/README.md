[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / @geekist/wp-kernel-cli

# @geekist/wp-kernel-cli

Top-level exports for the `@geekist/wp-kernel-cli` package.

This module re-exports the public surface of the CLI package so
documentation generators can build consistent API pages alongside the
kernel and UI packages.

## Classes

- [ApplyCommand](classes/ApplyCommand.md)
- [BuildCommand](classes/BuildCommand.md)
- [DevCommand](classes/DevCommand.md)
- [DoctorCommand](classes/DoctorCommand.md)
- [GenerateCommand](classes/GenerateCommand.md)
- [InitCommand](classes/InitCommand.md)
- [StartCommand](classes/StartCommand.md)

## Interfaces

- [SchemaConfig](interfaces/SchemaConfig.md)
- [AdaptersConfig](interfaces/AdaptersConfig.md)
- [KernelConfigV1](interfaces/KernelConfigV1.md)
- [AdapterContext](interfaces/AdapterContext.md)
- [PhpAdapterConfig](interfaces/PhpAdapterConfig.md)
- [AdapterExtensionContext](interfaces/AdapterExtensionContext.md)
- [AdapterExtension](interfaces/AdapterExtension.md)
- [LoadedKernelConfig](interfaces/LoadedKernelConfig.md)
- [IRSchema](interfaces/IRSchema.md)
- [IRRoute](interfaces/IRRoute.md)
- [IRResource](interfaces/IRResource.md)
- [IRPolicyHint](interfaces/IRPolicyHint.md)
- [IRBlock](interfaces/IRBlock.md)
- [IRPhpProject](interfaces/IRPhpProject.md)
- [IRv1](interfaces/IRv1.md)
- [BuildIrOptions](interfaces/BuildIrOptions.md)
- [PolicyCapabilityDescriptor](interfaces/PolicyCapabilityDescriptor.md)
- [PhpAstBuilder](interfaces/PhpAstBuilder.md)
- [PrinterContext](interfaces/PrinterContext.md)

## Type Aliases

- [ConfigOrigin](type-aliases/ConfigOrigin.md)
- [PhpAdapterFactory](type-aliases/PhpAdapterFactory.md)
- [AdapterExtensionFactory](type-aliases/AdapterExtensionFactory.md)
- [PolicyMapScope](type-aliases/PolicyMapScope.md)
- [PolicyMapEntry](type-aliases/PolicyMapEntry.md)
- [PolicyMapDefinition](type-aliases/PolicyMapDefinition.md)

## Variables

- [VERSION](variables/VERSION.md)

## Functions

- [runCli](functions/runCli.md)
- [definePolicyMap](functions/definePolicyMap.md)
