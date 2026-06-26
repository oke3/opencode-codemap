/**
 * Shared version string for generated file headers.
 * Reads from package.json at runtime so version bumps propagate automatically.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let _version: string | null = null;

export function codemapVersion(): string {
  if (_version) return _version;
  const dir = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(dir, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  _version = pkg.version as string;
  return _version;
}
