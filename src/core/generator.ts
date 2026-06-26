/**
 * Generator plugin system.
 * Each generator produces one or more OpenCode config files.
 */

import type { ProjectModel } from "./project.js";

export interface GeneratedFile {
  /** Relative path from project root, e.g. "AGENTS.md" */
  path: string;
  /** File content */
  content: string;
  /** If false, skip generation when file already exists */
  overwrite: boolean;
}

export interface GeneratorPlugin {
  name: string;
  generate(project: ProjectModel): Promise<GeneratedFile[]>;
}

/**
 * Run all registered generators and collect output files.
 */
export async function runGenerators(
  generators: GeneratorPlugin[],
  project: ProjectModel,
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  for (const gen of generators) {
    const results = await gen.generate(project);
    files.push(...results);
  }
  return files;
}
