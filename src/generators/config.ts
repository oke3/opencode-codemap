/**
 * opencode.json generator — produces project-specific OpenCode runtime config.
 */

import type { GeneratorPlugin, GeneratedFile } from "../core/generator.js";
import type { ProjectModel } from "../core/project.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ── Helpers ──────────────────────────────────────────────

function primaryLanguage(project: ProjectModel): string {
  if (project.langTooling.primary) return project.langTooling.primary;
  const langs = project.fileStructure.languages;
  if (langs[".ts"] || langs[".tsx"]) return "TypeScript";
  if (langs[".js"] || langs[".jsx"]) return "JavaScript";
  if (langs[".py"]) return "Python";
  if (langs[".go"]) return "Go";
  if (langs[".rs"]) return "Rust";
  return "Unknown";
}

function testPermission(testRunner: string | null, lang: string): Record<string, string> {
  const base: Record<string, string> = { "*": "allow" };

  if (testRunner) {
    if (lang === "Python") {
      base[`${testRunner} *`] = "allow";
    } else if (lang === "Go") {
      base["go test *"] = "allow";
    } else if (lang === "Rust") {
      base["cargo test"] = "allow";
    } else {
      base["npm test"] = "allow";
      base[`${testRunner} *`] = "allow";
    }
  }

  return base;
}

export const configGenerator: GeneratorPlugin = {
  name: "config",

  async generate(project: ProjectModel): Promise<GeneratedFile[]> {
    const config: Record<string, unknown> = {
      $schema: "https://opencode.ai/config.json",
    };

    const lang = primaryLanguage(project);

    // Model suggestions based on language/framework complexity
    const heavyFrameworks = ["Next.js", "Nuxt", "Angular", "SvelteKit", "Remix"];
    const isHeavy = project.frameworks.primary && heavyFrameworks.includes(project.frameworks.primary);
    const isSystemsLang = lang === "Go" || lang === "Rust";
    config.model = isHeavy || isSystemsLang ? "anthropic/claude-sonnet-4-5" : "opencode/gpt-5.1-codex";

    // Small model for cheap tasks  
    config.small_model = "anthropic/claude-haiku-4-5";

    // Permissions based on project maturity
    if (project.conventions.testRunner) {
      (config as Record<string, unknown>).permission = {
        bash: testPermission(project.conventions.testRunner, lang),
      };
    }

    // Formatter — only enable if detected
    if (project.conventions.formatter) {
      config.formatter = true;
    }

    // LSP — enable for TypeScript or Python projects
    if (project.conventions.typescript || lang === "Python") {
      config.lsp = true;
    }

    // Instructions — reference the generated AGENTS.md
    if (existsSync(join(project.root, "AGENTS.md"))) {
      config.instructions = ["AGENTS.md"];
    }

    // Default agent
    config.default_agent = "build";

    // Custom commands reference
    config.command = {};

    // Add formatter override config if prettier
    if (project.conventions.formatter === "prettier") {
      (config as Record<string, unknown>).formatter = {
        prettier: {
          disabled: false,
        },
      };
    }

    const content = JSON.stringify(config, null, 2) + "\n";

    return [{
      path: "opencode.json",
      content,
      overwrite: false,
    }];
  },
};

// Ponytail: inline require for package.json read to avoid extra imports
