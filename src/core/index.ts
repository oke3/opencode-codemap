export type {
  ProjectModel,
  FileStructure,
  FrameworkDetect,
  FrameworkInfo,
  Conventions,
} from "./project.js";

export type {
  ScannerPlugin,
  ScanContext,
  ScanResult,
} from "./scanner.js";
export { runScanners } from "./scanner.js";

export type {
  GeneratorPlugin,
  GeneratedFile,
} from "./generator.js";
export { runGenerators } from "./generator.js";
