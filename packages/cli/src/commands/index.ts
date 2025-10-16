/**
 * CLI commands re-exports
 *
 * The individual command modules contain richer documentation. These
 * re-exports are intended for top-level importers and for the CLI
 * registration performed in `cli/run.ts`.
 */
export { GenerateCommand } from './generate';
export { InitCommand } from './init';
export { DoctorCommand } from './doctor';
export { StartCommand } from './start';
export { BuildCommand } from './build';
export { ApplyCommand } from './apply';
