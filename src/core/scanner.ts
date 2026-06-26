/**
 * Scanner plugin system.
 * Each scanner analyzes one aspect of a project.
 */

import type { ProjectModel } from "./project.js";

export interface ScanContext {
  projectRoot: string;
}

export interface ScanResult {
  type: string;
  data: unknown;
}

export interface ScannerPlugin {
  name: string;
  /** Called once per scan. Returns a chunk of the project model. */
  scan(context: ScanContext): Promise<ScanResult>;
}

/**
 * Run all registered scanners and aggregate results.
 */
export async function runScanners(
  scanners: ScannerPlugin[],
  context: ScanContext,
): Promise<ProjectModel["raw"]> {
  const raw: ProjectModel["raw"] = {};
  for (const scanner of scanners) {
    const result = await scanner.scan(context);
    raw[result.type] = result.data;
  }
  return raw;
}
