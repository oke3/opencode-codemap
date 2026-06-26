/**
 * AGENTS.md generator — produces project-specific OpenCode instructions.
 * Handles JS/TS, Python, Go, and Rust projects.
 */

import type { GeneratorPlugin, GeneratedFile } from "../core/generator.js";
import type { ProjectModel, WorkspaceModel } from "../core/project.js";
import { codemapVersion } from "../version.js";

function primaryLanguage(project: ProjectModel): string {
  // Prefer explicit language tooling detection
  if (project.langTooling.primary) return project.langTooling.primary;

  // Fall back to file extension counts
  const langs = project.fileStructure.languages;
  if (langs[".ts"] || langs[".tsx"]) return "TypeScript";
  if (langs[".js"] || langs[".jsx"]) return "JavaScript";
  if (langs[".py"]) return "Python";
  if (langs[".go"]) return "Go";
  if (langs[".rs"]) return "Rust";
  return "Unknown";
}

function isJsFamily(lang: string): boolean {
  return lang === "TypeScript" || lang === "JavaScript";
}

function renderBuildCommands(project: ProjectModel): string {
  const lang = primaryLanguage(project);
  const lines: string[] = [];

  if (isJsFamily(lang)) {
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
    if (lang === "TypeScript") {
      lines.push("- **Type check**: `npx tsc --noEmit`");
    }
  } else if (lang === "Python") {
    const py = project.langTooling.python;
    const buildTool = py?.buildTool ?? "pip";
    if (py?.linter) {
      const cmd = py.linter === "ruff" ? "ruff check" : py.linter;
      const runner = buildTool === "uv" ? `uv run ${cmd}` : `pipx run ${cmd}`;
      lines.push(`- **Lint**: \`${runner} .\` (${py.linter})`);
    }
    if (py?.formatter) {
      const cmd = py.formatter === "ruff" ? "ruff format" : py.formatter;
      const prefix = buildTool === "uv" ? "uv run" : buildTool === "poetry" ? "poetry run" : null;
      lines.push(`- **Format**: \`${[prefix, cmd, "."].filter(Boolean).join(" ")}\` (${py.formatter})`);
    }
    if (py?.testRunner) {
      const prefix = buildTool === "uv" ? "uv run" : buildTool === "poetry" ? "poetry run" : null;
      lines.push(`- **Test**: \`${[prefix, py.testRunner].filter(Boolean).join(" ")}\``);
    }
    if (py?.buildTool) {
      const cmd = py.buildTool === "uv" ? "uv sync" : py.buildTool === "poetry" ? "poetry install" : "pip install -e .";
      lines.push(`- **Install**: \`${cmd}\``);
    }
    if (!py?.linter && !py?.formatter && !py?.testRunner) {
      lines.push("- (No standard tooling detected — consider adding ruff, pytest)");
    }
  } else if (lang === "Go") {
    lines.push("- **Test**: `go test ./...`");
    lines.push("- **Build**: `go build ./...`");
    if (project.conventions.linter) {
      lines.push(`- **Lint**: \`golangci-lint run ./...\` (${project.conventions.linter})`);
    }
    lines.push(`- **Format**: \`gofmt -s -w .\` (gofmt)`);
  } else if (lang === "Rust") {
    lines.push("- **Test**: `cargo test`");
    lines.push("- **Build**: `cargo build`");
    lines.push("- **Check**: `cargo check`");
    if (project.conventions.linter) {
      lines.push(`- **Lint**: \`cargo clippy -- -D warnings\` (${project.conventions.linter})`);
    }
    lines.push("- **Format**: `cargo fmt` (rustfmt)");
  } else {
    lines.push("- (No standard tooling detected for this project type)");
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
  const lang = primaryLanguage(project);
  const lines: string[] = [];

  if (project.conventions.typescript) {
    lines.push("- TypeScript" + (project.conventions.strictMode ? " (strict mode)" : ""));
  }

  if (isJsFamily(lang)) {
    lines.push("- Import style: ES modules (`import`/`export`)");
    lines.push("- Async: `async/await`");
  } else if (lang === "Python") {
    lines.push("- Import style: Python standard (`import`/`from`)");
    lines.push("- Async: `async/await`");
    lines.push("- Type hints encouraged (`typing` module)");
    if (project.langTooling.python?.linter === "ruff") {
      lines.push("- Linting: ruff (fast Rust-based linter)");
    }
  } else if (lang === "Go") {
    lines.push("- Import style: Go standard (`import` statements)");
    lines.push("- Error handling: explicit `if err != nil`");
    lines.push("- Concurrency: goroutines + channels");
    lines.push("- Naming: CamelCase for exported, camelCase for unexported");
  } else if (lang === "Rust") {
    lines.push("- Import style: `use` statements");
    lines.push("- Error handling: `Result<T, E>` and `?` operator");
    lines.push("- Ownership: follow borrow checker rules");
    lines.push("- Naming: snake_case for functions/vars, PascalCase for types");
  } else {
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
    const lang = primaryLanguage(project);
    if (lang === "Python") {
      lines.push("- **Python project** — follow PEP 8 conventions.");
      lines.push("  - Use `__init__.py` for package structure.");
    } else if (lang === "Go") {
      lines.push("- **Go project** — follow standard Go layout conventions.");
      lines.push("  - `main.go` or `cmd/` for entry points.");
    } else if (lang === "Rust") {
      lines.push("- **Rust project** — Cargo-based project with standard layout.");
      lines.push("  - `src/main.rs` or `src/lib.rs` for entry points.");
    } else {
      lines.push("- No major framework detected. Follow the project's existing patterns.");
    }
  }

  return lines.join("\n");
}

function renderWorkspaces(project: ProjectModel): string {
  if (!project.workspaces || project.workspaces.length === 0) return "";

  const lines: string[] = [
    "",
    "## Workspaces",
    "",
    `This project has **${project.workspaces.length}** workspaces:`,
    "",
  ];

  for (const ws of project.workspaces) {
    const fw = ws.model.frameworks.primary ?? "unknown";
    const lang = primaryLanguage(ws.model);
    lines.push(`- **${ws.name}** — ${fw} (${lang}) — \`${ws.root}\``);
  }

  lines.push("");
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
      renderWorkspaces(project),
      `<!-- Generated by @oke3/opencode-codemap v${codemapVersion()} -->`,
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
