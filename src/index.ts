/**
 * @oke3/opencode-codemap — public API.
 *
 * Usage:
 *   import { scan, generate, buildProject } from "@oke3/opencode-codemap";
 */

import { basename } from "node:path";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProjectModel, LanguageTooling } from "./core/project.js";
import type { ScannerPlugin } from "./core/scanner.js";
import { runScanners } from "./core/scanner.js";
import type { GeneratorPlugin } from "./core/generator.js";
import { runGenerators } from "./core/generator.js";
import type { GeneratedFile } from "./core/generator.js";
import { filesScanner } from "./scanners/files.js";
import { frameworksScanner } from "./scanners/frameworks.js";
import { languagesScanner } from "./scanners/languages.js";
import { agentsGenerator } from "./generators/agents.js";
import { configGenerator } from "./generators/config.js";
import { agentsConfigGenerator } from "./generators/agents-config.js";
import { commandsGenerator } from "./generators/commands.js";
import { multiToolGenerator } from "./generators/multi-tool.js";

// ── Default plugins ──────────────────────────────────────

export const defaultScanners: ScannerPlugin[] = [
  filesScanner,
  frameworksScanner,
  languagesScanner,
];

export const defaultGenerators: GeneratorPlugin[] = [
  agentsGenerator,
  configGenerator,
  agentsConfigGenerator,
  commandsGenerator,
  multiToolGenerator,
];

// ── Public API ───────────────────────────────────────────

export interface ScanOptions {
  scanners?: ScannerPlugin[];
}

export interface GenerateOptions {
  generators?: GeneratorPlugin[];
}

/**
 * Scan a project and return the full project model.
 */
export async function scan(
  projectRoot: string,
  options: ScanOptions = {},
): Promise<ProjectModel> {
  const scanners = options.scanners ?? defaultScanners;
  const raw = await runScanners(scanners, { projectRoot });

  // Unpack raw scan data into the typed model
  const files = raw.files as import("./core/project.js").FileStructure;
  const fws = raw.frameworks as { detected: import("./core/project.js").FrameworkDetect[]; conventions: import("./core/project.js").Conventions };

  // Prefer package.json name over directory name
  let projectName = basename(projectRoot);
  try {
    const pkgRaw = readFileSync(join(projectRoot, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);
    if (pkg.name) projectName = pkg.name;
  } catch { /* fallback to dir name */ }

  // Extract language tooling from raw scan data
  const langTooling = (raw.languages ?? null) as LanguageTooling | null;

  // Build conventions from frameworks scanner, falling back to language scanner
  let conventions = fws?.conventions ?? { testRunner: null, linter: null, formatter: null, typescript: false, strictMode: false };
  if (langTooling && !conventions.testRunner && !conventions.linter && !conventions.formatter) {
    const py = langTooling.python;
    const go = langTooling.go;
    const rust = langTooling.rust;
    if (py) {
      conventions = { ...conventions, testRunner: py.testRunner, linter: py.linter, formatter: py.formatter };
    } else if (go) {
      conventions = { ...conventions, testRunner: "go test", formatter: "gofmt", linter: go.linter };
    } else if (rust) {
      conventions = { ...conventions, testRunner: "cargo test", formatter: "rustfmt", linter: rust.linter };
    }
  }

  const model: ProjectModel = {
    root: projectRoot,
    name: projectName,
    fileStructure: files ?? { totalFiles: 0, directories: [], entryPoints: [], hasSrc: false, hasApp: false, hasMonorepo: false, languages: {} },
    frameworks: {
      primary: fws?.detected?.[0]?.name ?? null,
      detected: fws?.detected ?? [],
    },
    conventions,
    langTooling: langTooling ?? { primary: null, python: null, go: null, rust: null, docker: null, env: null },
    raw,
  };

  return model;
}

/**
 * Generate OpenCode config files from a project model.
 */
export async function generate(
  project: ProjectModel,
  options: GenerateOptions = {},
): Promise<GeneratedFile[]> {
  const generators = options.generators ?? defaultGenerators;
  return runGenerators(generators, project);
}

/**
 * Scan + generate in one call.
 */
export async function buildProject(
  projectRoot: string,
  options: ScanOptions & GenerateOptions = {},
): Promise<{ model: ProjectModel; files: GeneratedFile[] }> {
  const model = await scan(projectRoot, options);
  const files = await generate(model, options);
  return { model, files };
}

// Re-export types for plugin authors
export type { ProjectModel } from "./core/project.js";
export type { ScannerPlugin, ScanContext, ScanResult } from "./core/scanner.js";
export type { GeneratorPlugin, GeneratedFile } from "./core/generator.js";
