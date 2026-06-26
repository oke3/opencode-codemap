# @groundzero/opencode-codemap

Scan any codebase, auto-generate OpenCode project config. Solves the cold start problem.

```bash
npx @groundzero/opencode-codemap
```

## Why

Every OpenCode project starts blank. The built-in `/init` generates basic `AGENTS.md` — but you need more: proper `opencode.json`, custom agents, skill recommendations, commands. codemap fills that gap.

## Usage

```bash
# Quick setup — scan + generate all in one go
npx @groundzero/opencode-codemap

# Scan only (saves .scan.json for later use)
npx @groundzero/opencode-codemap scan

# Generate from existing .scan.json
npx @groundzero/opencode-codemap generate

# Scan a specific path
npx @groundzero/opencode-codemap scan ./path/to/project
```

## What it generates

| File | Content |
|------|---------|
| `AGENTS.md` | Project identity, stack, build/test commands, structure, conventions, framework-specific notes |
| *(more generators coming in future phases)* | |

## Architecture

Plugin-based. Scanners analyze the project, generators produce config files.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ File Scanner │     │ Frameworks   │     │   (future)  │
│ (tree walk,  │ ──▶ │ Scanner      │ ──▶ │   Plugin    │
│  .gitignore) │     │ (deps, lint) │     │   Scanners  │
└─────────────┘     └──────────────┘     └─────────────┘
                      │
                      ▼
              ┌─────────────────┐
              │   ProjectModel   │
              └─────────────────┘
                      │
                      ▼
              ┌──────────────┐     ┌─────────────┐
              │ AGENTS.md    │     │   (future)  │
              │ Generator    │ ──▶ │   Plugin    │
              │              │     │   Generators│
              └──────────────┘     └─────────────┘
```

## Extending

Add a scanner:

```ts
import type { ScannerPlugin } from "@groundzero/opencode-codemap";

export const myScanner: ScannerPlugin = {
  name: "my-scanner",
  async scan(context) {
    // analyze context.projectRoot
    return { type: "my-scanner", data: { /* ... */ } };
  },
};
```

Add a generator:

```ts
import type { GeneratorPlugin } from "@groundzero/opencode-codemap";

export const myGenerator: GeneratorPlugin = {
  name: "my-generator",
  async generate(project) {
    return [{ path: "MY_FILE.md", content: "hello", overwrite: true }];
  },
};
```

## License

MIT — Ground Zero LLC

---

*Need a custom OpenCode setup for your team? → [Check us out](https://ground-zero-portfolio.pages.dev)*
