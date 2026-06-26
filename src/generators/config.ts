/**
 * opencode.json generator — produces project-specific OpenCode runtime config.
 */

import type { GeneratorPlugin, GeneratedFile } from "../core/generator.js";
import type { ProjectModel } from "../core/project.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const configGenerator: GeneratorPlugin = {
  name: "config",

  async generate(project: ProjectModel): Promise<GeneratedFile[]> {
    const config: Record<string, unknown> = {
      $schema: "https://opencode.ai/config.json",
    };

    // Model suggestions based on framework
    const heavyFrameworks = ["Next.js", "Nuxt", "Angular", "SvelteKit", "Remix"];
    const isHeavy = project.frameworks.primary && heavyFrameworks.includes(project.frameworks.primary);
    config.model = isHeavy ? "anthropic/claude-sonnet-4-5" : "opencode/gpt-5.1-codex";

    // Small model for cheap tasks  
    config.small_model = "anthropic/claude-haiku-4-5";

    // Permissions based on project maturity
    const permissions: Record<string, string | Record<string, string>> = {};
    if (project.conventions.testRunner) {
      permissions["bash"] = {
        "*": "allow",
        "npm test": "allow",
        [`${project.conventions.testRunner} *`]: "allow",
      };
    }

    // Formatter — only enable if detected
    if (project.conventions.formatter) {
      config.formatter = true;
    }

    // LSP — enable for TypeScript projects
    if (project.conventions.typescript) {
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

    if (Object.keys(permissions).length > 0) {
      config.permission = permissions;
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
