/**
 * AGENTS.md generator — produces project-specific OpenCode instructions.
 */

import type { GeneratorPlugin, GeneratedFile } from "../core/generator.js";
import type { ProjectModel } from "../core/project.js";

function primaryLanguage(project: ProjectModel): string {
  const langs = project.fileStructure.languages;
  if (langs[".ts"] || langs[".tsx"]) return "TypeScript";
  if (langs[".js"] || langs[".jsx"]) return "JavaScript";
  if (langs[".py"]) return "Python";
  if (langs[".go"]) return "Go";
  if (langs[".rs"]) return "Rust";
  return "Unknown";
}

function renderBuildCommands(project: ProjectModel): string {
  const lines: string[] = [];

  if (project.conventions.linter) {
    lines.push(`- **Lint**: \`npm run lint\` (${project.conventions.linter})`);
  }
  if (project.conventions.formatter) {
    lines.push(`- **Format**: \`npm run format\` (${project.conventions.formatter})`);
  }
  if (project.conventions.testRunner) {
    lines.push(`- **Test**: \`npm test\` (${project.conventions.testRunner})`);
    lines.push(`- **Test (watch)**: \`npm run test:watch\``);
  }

  if (lines.length === 0) {
    lines.push("- (No standard tooling detected — add scripts to `package.json`)");
  }

  lines.push("- **Build**: `npm run build`");
  if (primaryLanguage(project) === "TypeScript") {
    lines.push("- **Type check**: `npx tsc --noEmit`");
  }

  return lines.join("\n");
}

function renderProjectStructure(project: ProjectModel): string {
  const parts: string[] = [];

  if (project.frameworks.primary) {
    parts.push(`- Primary framework: **${project.frameworks.primary}**`);
  }

  const dirs = project.fileStructure.directories.filter(
    (d) => d.split("/").length <= 2,
  ).slice(0, 15);

  if (dirs.length > 0) {
    parts.push("- Key directories:");
    parts.push("```");
    parts.push(project.name + "/");
    for (const d of dirs.slice(0, 10)) {
      parts.push(`  ${d}/`);
    }
    if (dirs.length > 10) {
      parts.push(`  … (${dirs.length} directories total)`);
    }
    parts.push("```");
  }

  if (project.fileStructure.entryPoints.length > 0) {
    parts.push(`- Entry points: \`${project.fileStructure.entryPoints.join("`, `")}\``);
  }

  return parts.join("\n");
}

function renderConventions(project: ProjectModel): string {
  const lines: string[] = [];

  if (project.conventions.typescript) {
    lines.push("- TypeScript" + (project.conventions.strictMode ? " (strict mode)" : ""));
  }

  const lang = primaryLanguage(project);
  if (lang === "TypeScript" || lang === "JavaScript") {
    lines.push("- Import style: ES modules (`import`/`export`)");
    lines.push("- Async: `async/await`");
  } else if (lang === "Python") {
    lines.push("- Import style: Python standard (`import`/`from`)");
    lines.push("- Async: `async/await`");
  }

  if (lines.length === 0) {
    lines.push("- (Follow the project's existing conventions)");
  }

  return lines.join("\n");
}

function renderFrameworkNotes(project: ProjectModel): string {
  const lines: string[] = [];
  const fw = project.frameworks.detected;

  for (const f of fw) {
    switch (f.name) {
      case "Astro":
        lines.push("- **Astro**: `.astro` files use a component-based island architecture.");
        lines.push("  - Content collections live in `src/content/`.");
        lines.push("  - API routes go in `src/pages/` as `.ts` files.");
        break;
      case "Next.js":
        lines.push("- **Next.js**: App Router with file-based routing.");
        lines.push("  - Route segments in `app/`, API routes as route handlers.");
        lines.push("  - Server components by default; \"use client\" for interactivity.");
        break;
      case "React":
        lines.push("- **React**: Functional components with hooks. JSX files.");
        lines.push("  - State management: check if using Context, Zustand, or Redux.");
        break;
      case "Express":
        lines.push("- **Express**: API routes in dedicated route files.");
        lines.push("  - Middleware stack for auth, validation, error handling.");
        break;
      case "Hono":
        lines.push("- **Hono**: Lightweight API framework. Route handlers in dedicated files.");
        break;
      case "Svelte":
      case "SvelteKit":
        lines.push("- **Svelte/SvelteKit**: Reactive components with `$state`, `$derived`.");
        break;
      case "Vue":
      case "Nuxt":
        lines.push("- **Vue/Nuxt**: SFC with `<script setup>`, Composition API.");
        break;
    }
  }

  if (fw.length > 0 && lines.length === 0) {
    lines.push(`- This project uses **${fw.map((f) => f.name).join(", ")}**.`);
    lines.push("  - Follow the framework's conventions for file structure and patterns.");
  }

  if (fw.length === 0) {
    lines.push("- No major framework detected. Follow the project's existing patterns.");
  }

  return lines.join("\n");
}

export const agentsGenerator: GeneratorPlugin = {
  name: "agents",

  async generate(project: ProjectModel): Promise<GeneratedFile[]> {
    const lang = primaryLanguage(project);

    const content = [
      `# ${project.name}`,
      "",
      "## Stack",
      `- Language: **${lang}**`,
      project.frameworks.primary ? `- Framework: **${project.frameworks.primary}**` : "",
      project.conventions.typescript ? "- TypeScript: yes" : "",
      "",
      "## Build & Test",
      renderBuildCommands(project),
      "",
      "## Project Structure",
      renderProjectStructure(project),
      "",
      "## Conventions",
      renderConventions(project),
      "",
      "## Framework Notes",
      renderFrameworkNotes(project),
      "",
      `<!-- Generated by @oke3/opencode-codemap v0.1.0 -->`,
      `<!-- Need a custom OpenCode setup for your team? → https://ground-zero-portfolio.pages.dev -->`,
      "",
    ]
      .filter((l) => l !== undefined)
      .join("\n");

    const file: GeneratedFile = {
      path: "AGENTS.md",
      content,
      overwrite: true,
    };

    return [file];
  },
};
