/**
 * Project model — the aggregated result of all scanners.
 * Generators consume this to produce OpenCode config files.
 */

export interface FileStructure {
  totalFiles: number;
  directories: string[];
  entryPoints: string[];
  hasSrc: boolean;
  hasApp: boolean;
  hasMonorepo: boolean;
  languages: Record<string, number>; // extension -> count
}

export interface FrameworkDetect {
  name: string;
  version: string | null;
}

export interface FrameworkInfo {
  primary: string | null;
  detected: FrameworkDetect[];
}

export interface Conventions {
  testRunner: string | null;
  linter: string | null;
  formatter: string | null;
  typescript: boolean;
  strictMode: boolean;
}

export interface PythonInfo {
  testRunner: string | null;
  linter: string | null;
  formatter: string | null;
  buildTool: string | null;
}

export interface GoInfo {
  linter: string | null;
}

export interface RustInfo {
  linter: string | null;
}

export interface LanguageTooling {
  /** Primary language detected from project config files */
  primary: string | null;
  python: PythonInfo | null;
  go: GoInfo | null;
  rust: RustInfo | null;
}

export interface ProjectModel {
  root: string;
  name: string;
  fileStructure: FileStructure;
  frameworks: FrameworkInfo;
  conventions: Conventions;
  /** Language-specific tooling for non-JS projects */
  langTooling: LanguageTooling;
  /** Raw scan data preserved for generator plugins */
  raw: Record<string, unknown>;
}
