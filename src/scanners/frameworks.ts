/**
 * Framework scanner — detects web frameworks and languages from project files.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ScannerPlugin, ScanContext, ScanResult } from "../core/scanner.js";
import type { FrameworkDetect, FrameworkInfo, Conventions } from "../core/project.js";

interface RawFrameworks {
  detected: FrameworkDetect[];
  conventions: Conventions;
}

/**
 * Read package.json if it exists.
 */
function readPackageJson(root: string): Record<string, unknown> | null {
  const path = join(root, "package.json");
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Read tsconfig.json if it exists.
 */
function readTsconfig(root: string): Record<string, unknown> | null {
  const path = join(root, "tsconfig.json");
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Detect test runner from devDependencies and config files.
 */
function detectTestRunner(pkg: Record<string, unknown> | null, root: string): string | null {
  const deps = { ...(pkg?.dependencies as Record<string, string> || {}), ...(pkg?.devDependencies as Record<string, string> || {}) };
  if (deps["vitest"]) return "vitest";
  if (deps["jest"]) return "jest";
  if (deps["mocha"]) return "mocha";
  if (deps["ava"]) return "ava";
  if (deps["uvu"]) return "uvu";
  if (existsSync(join(root, "vitest.config.ts")) || existsSync(join(root, "vitest.config.js"))) return "vitest";
  if (existsSync(join(root, "jest.config.ts")) || existsSync(join(root, "jest.config.js"))) return "jest";
  return null;
}

/**
 * Detect linter from config files.
 */
function detectLinter(root: string): string | null {
  if (existsSync(join(root, "eslint.config.js")) || existsSync(join(root, ".eslintrc.js")) || existsSync(join(root, ".eslintrc.json"))) return "eslint";
  if (existsSync(join(root, "biome.json")) || existsSync(join(root, "biome.jsonc"))) return "biome";
  if (existsSync(join(root, "ruff.toml")) || existsSync(join(root, ".ruff.toml"))) return "ruff";
  if (existsSync(join(root, ".rubocop.yml"))) return "rubocop";
  return null;
}

/**
 * Detect formatter from config files and dependencies.
 */
function detectFormatter(pkg: Record<string, unknown> | null, root: string): string | null {
  if (existsSync(join(root, ".prettierrc")) || existsSync(join(root, ".prettierrc.json")) || existsSync(join(root, ".prettierrc.js"))) return "prettier";
  if (existsSync(join(root, "biome.json")) || existsSync(join(root, "biome.jsonc"))) return "biome";
  const deps = { ...(pkg?.dependencies as Record<string, string> || {}), ...(pkg?.devDependencies as Record<string, string> || {}) };
  if (deps["prettier"]) return "prettier";
  if (deps["@biomejs/biome"]) return "biome";
  return null;
}

export const frameworksScanner: ScannerPlugin = {
  name: "frameworks",

  async scan(context: ScanContext): Promise<ScanResult> {
    const pkg = readPackageJson(context.projectRoot);
    const tsconfig = readTsconfig(context.projectRoot);
    const detected: FrameworkDetect[] = [];

    // Parse dependencies for frameworks
    if (pkg) {
      const allDeps = { ...(pkg.dependencies as Record<string, string> || {}), ...(pkg.devDependencies as Record<string, string> || {}) };

      const knownFrameworks: Record<string, string> = {
        "next": "Next.js",
        "react": "React",
        "vue": "Vue",
        "svelte": "Svelte",
        "astro": "Astro",
        "@angular/core": "Angular",
        "express": "Express",
        "fastify": "Fastify",
        "hono": "Hono",
        "nuxt": "Nuxt",
        "gatsby": "Gatsby",
        "remix": "Remix",
        "@remix-run/react": "Remix",
        "solid-js": "Solid",
        "preact": "Preact",
        "@sveltejs/kit": "SvelteKit",
        "@nestjs/core": "NestJS",
        "@nuxt/kit": "Nuxt",
      };

      for (const [pkgName, frameworkName] of Object.entries(knownFrameworks)) {
        if (allDeps[pkgName]) {
          detected.push({ name: frameworkName, version: allDeps[pkgName] });
        }
      }
    }

    function readStrictMode(path: string): boolean {
      try {
        const content = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
        const compilerOptions = content["compilerOptions"] as Record<string, unknown> | undefined;
        return !!(compilerOptions?.["strict"]);
      } catch {
        return false;
      }
    }

    // Derive primary framework
    const priority = ["Next.js", "Astro", "Remix", "Nuxt", "SvelteKit", "React", "Vue", "Angular", "Express", "Fastify", "Hono", "NestJS"];
    const primary = priority.find((f) => detected.some((d) => d.name === f)) || detected[0]?.name || null;

    const data: RawFrameworks = {
      detected,
      conventions: {
        testRunner: detectTestRunner(pkg, context.projectRoot),
        linter: detectLinter(context.projectRoot),
        formatter: detectFormatter(pkg, context.projectRoot),
        typescript: !!tsconfig || detected.some((d) => d.name === "Astro" || d.name === "Next.js" || d.name === "SvelteKit" || d.name === "Remix" || d.name === "Nuxt"),
        strictMode: tsconfig ? readStrictMode(join(context.projectRoot, "tsconfig.json")) : false,
      },
    };

    return { type: "frameworks", data };
  },
};
