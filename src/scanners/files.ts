/**
 * File scanner — walks the project tree and detects structure.
 * Honors .gitignore via the `ignore` package.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import type { Stats } from "node:fs";
import { join, relative, extname, basename } from "node:path";
import ignore from "ignore";
import type { ScannerPlugin, ScanContext, ScanResult } from "../core/scanner.js";
import type { FileStructure } from "../core/project.js";

interface WalkEntry {
  path: string;
  isDir: boolean;
}

/**
 * Recursively walk a directory, respecting .gitignore rules.
 */
function walk(root: string): WalkEntry[] {
  const ig = ignore();
  const gitignorePath = join(root, ".gitignore");
  try {
    const rules = readFileSync(gitignorePath, "utf-8");
    ig.add(rules);
  } catch {
    // no .gitignore — that's fine
  }

  const entries: WalkEntry[] = [];
  const walkDir = (dir: string) => {
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      const abs = join(dir, name);
      const rel = relative(root, abs);
      if (ig.ignores(rel)) continue;

      let s: Stats;
      try {
        s = statSync(abs);
      } catch {
        continue;
      }

      if (s.isDirectory()) {
        if (name === "node_modules" || name === ".git") continue;
        if (name === "fixtures" || name === "__fixtures__" || name === "examples") continue;
        entries.push({ path: rel, isDir: true });
        walkDir(abs);
      } else {
        entries.push({ path: rel, isDir: false });
      }
    }
  };

  walkDir(root);
  return entries;
}

/**
 * Detect entry point files.
 */
function findEntryPoints(entries: WalkEntry[]): string[] {
  const candidates = ["index.ts", "index.tsx", "index.js", "index.jsx", "main.ts", "main.tsx", "main.js", "app.ts", "app.tsx", "app.js"];
  return entries
    .filter((e) => !e.isDir && candidates.includes(basename(e.path)))
    .map((e) => e.path);
}

/**
 * Count files by extension.
 */
function countLanguages(entries: WalkEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    if (e.isDir) continue;
    const ext = extname(e.path).toLowerCase();
    if (ext) {
      counts[ext] = (counts[ext] || 0) + 1;
    }
  }
  return counts;
}

export const filesScanner: ScannerPlugin = {
  name: "files",

  async scan(context: ScanContext): Promise<ScanResult> {
    const entries = walk(context.projectRoot);
    const dirs = entries.filter((e) => e.isDir).map((e) => e.path);
    const files = entries.filter((e) => !e.isDir);

    const hasSrc = dirs.some((d) => d === "src" || d.startsWith("src/"));
    const hasApp = dirs.some((d) => d === "app" || d.startsWith("app/"));
    const hasMonorepo = dirs.some((d) => d === "packages" || d.startsWith("packages/"));

    const data: FileStructure = {
      totalFiles: files.length,
      directories: dirs,
      entryPoints: findEntryPoints(entries),
      hasSrc,
      hasApp,
      hasMonorepo,
      languages: countLanguages(entries),
    };

    return { type: "files", data };
  },
};
