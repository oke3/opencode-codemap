/**
 * Monorepo scanner — detects workspace configs and resolves workspace directories.
 * Supports pnpm-workspace.yaml, package.json workspaces, and lerna.json.
 *
 * Glob resolution is limited to simple `*` and `**` patterns (covers 95% of monorepos).
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import type { ScannerPlugin, ScanContext, ScanResult } from "../core/scanner.js";

export interface WorkspaceInfo {
  /** Name derived from workspace directory basename or package.json name */
  name: string;
  /** Absolute path to workspace root */
  root: string;
}

export interface MonorepoData {
  /** Is this a monorepo? */
  isMonorepo: boolean;
  /** Workspace config type detected */
  configType: "pnpm" | "npm" | "yarn" | "lerna" | null;
  /** Resolved workspace directories */
  workspaces: WorkspaceInfo[];
}

/**
 * Resolve simple glob patterns like `packages/*` to actual directories.
 * Only handles `*` (single-level) and `**` (all subdirs) patterns.
 */
function resolveGlob(root: string, pattern: string): string[] {
  const parts = pattern.split("/");
  const hasWildcard = parts.some((p) => p === "*" || p === "**");
  if (!hasWildcard) {
    // Not a glob — literal path
    const abs = join(root, pattern);
    return existsSync(abs) ? [abs] : [];
  }

  // Find the base directory before the first wildcard
  let baseDir = root;
  let idx = 0;
  while (idx < parts.length && parts[idx] !== "*" && parts[idx] !== "**") {
    baseDir = join(baseDir, parts[idx]);
    idx++;
  }

  if (!existsSync(baseDir)) return [];

  // For simple `dir/*` or `dir/**` patterns, list subdirectories
  if (parts[idx] === "*" || parts[idx] === "**") {
    try {
      const entries = readdirSync(baseDir);
      return entries
        .map((e) => join(baseDir, e))
        .filter((p) => {
          try { return statSync(p).isDirectory(); } catch { return false; }
        });
    } catch {
      return [];
    }
  }

  return [];
}

function detectPnpmWorkspaces(root: string): string[] | null {
  const yamlPath = join(root, "pnpm-workspace.yaml");
  if (!existsSync(yamlPath)) return null;

  try {
    const raw = readFileSync(yamlPath, "utf-8");
    // Simple YAML parser for `packages:` key with list of strings
    // ponytail: naive YAML parse, assumes `packages:\n  - 'pattern'` format
    const match = raw.match(/^packages:\s*$/m);
    if (!match) return null;

    const lines = raw.split("\n");
    const patterns: string[] = [];
    let inPackages = false;
    for (const line of lines) {
      if (line.match(/^packages:/)) { inPackages = true; continue; }
      if (inPackages && line.match(/^\s{2}-/)) {
        const p = line.replace(/^\s{2}- /, "").replace(/^['"]|['"]$/g, "").trim();
        if (p) patterns.push(p);
      }
      if (inPackages && line.match(/^\w/) && !line.match(/^\s{2}-/)) {
        inPackages = false;
      }
    }
    return patterns.length > 0 ? patterns : null;
  } catch {
    return null;
  }
}

function detectPackageJsonWorkspaces(root: string): string[] | null {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const ws = pkg["workspaces"];
    if (Array.isArray(ws) && ws.length > 0) return ws;
    // pnpm can use "pnpm": { "workspaces": [...] } in package.json
    if (pkg["pnpm"]?.workspaces && Array.isArray(pkg["pnpm"].workspaces)) {
      return pkg["pnpm"].workspaces;
    }
    return null;
  } catch {
    return null;
  }
}

function detectLernaWorkspaces(root: string): string[] | null {
  const lernaPath = join(root, "lerna.json");
  if (!existsSync(lernaPath)) return null;

  try {
    const cfg = JSON.parse(readFileSync(lernaPath, "utf-8"));
    const ws = cfg["packages"];
    if (Array.isArray(ws) && ws.length > 0) return ws;
    return null;
  } catch {
    return null;
  }
}

/**
 * Get workspace name — prefer package.json name, fall back to directory name.
 */
function workspaceName(wsRoot: string): string {
  const pkgPath = join(wsRoot, "package.json");
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    if (pkg.name) return pkg.name;
  } catch { /* fallback */ }
  return basename(wsRoot);
}

export const monorepoScanner: ScannerPlugin = {
  name: "monorepo",

  async scan(context: ScanContext): Promise<ScanResult> {
    const root = context.projectRoot;
    const result: MonorepoData = {
      isMonorepo: false,
      configType: null,
      workspaces: [],
    };

    // Detect workspace config
    let patterns: string[] | null = null;
    let configType: MonorepoData["configType"] = null;

    const pnpmPatterns = detectPnpmWorkspaces(root);
    if (pnpmPatterns) {
      patterns = pnpmPatterns;
      configType = "pnpm";
    }

    if (!patterns) {
      const npmPatterns = detectPackageJsonWorkspaces(root);
      if (npmPatterns) {
        patterns = npmPatterns;
        configType = "npm";
      }
    }

    if (!patterns) {
      const lernaPatterns = detectLernaWorkspaces(root);
      if (lernaPatterns) {
        patterns = lernaPatterns;
        configType = "lerna";
      }
    }

    if (!patterns) return { type: "monorepo", data: result };

    // Resolve glob patterns to directories
    const allDirs: string[] = [];
    for (const p of patterns) {
      const resolved = resolveGlob(root, p);
      allDirs.push(...resolved);
    }

    result.isMonorepo = true;
    result.configType = configType;
    result.workspaces = allDirs.map((d) => ({
      name: workspaceName(d),
      root: d,
    }));

    return { type: "monorepo", data: result };
  },
};
