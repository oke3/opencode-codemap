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

export interface ProjectModel {
  root: string;
  name: string;
  fileStructure: FileStructure;
  frameworks: FrameworkInfo;
  conventions: Conventions;
  /** Raw scan data preserved for generator plugins */
  raw: Record<string, unknown>;
}
