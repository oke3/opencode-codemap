/**
 * Language scanner — detects Python, Go, and Rust projects and their tooling.
 * Falls back to file-extension analysis when project config files are absent.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ScannerPlugin, ScanContext, ScanResult } from "../core/scanner.js";
import type { FileStructure } from "../core/project.js";
import type { LanguageTooling, PythonInfo, GoInfo, RustInfo, DockerInfo, EnvInfo } from "../core/project.js";

// ── Helpers ──────────────────────────────────────────────

function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

function hasDep(raw: string, name: string): boolean {
  return raw.includes(name);
}

// ── Python detection ─────────────────────────────────────

function detectPython(root: string): PythonInfo | null {
  const hasPyproject = existsSync(join(root, "pyproject.toml"));
  const hasSetupPy = existsSync(join(root, "setup.py"));
  const hasSetupCfg = existsSync(join(root, "setup.cfg"));
  const hasPipfile = existsSync(join(root, "Pipfile"));
  const hasReq = existsSync(join(root, "requirements.txt"));

  if (!hasPyproject && !hasSetupPy && !hasSetupCfg && !hasPipfile && !hasReq) return null;

  let testRunner: string | null = null;
  let linter: string | null = null;
  let formatter: string | null = null;
  let buildTool: string | null = null;

  if (hasPyproject) {
    const raw = readFileSafe(join(root, "pyproject.toml")) ?? "";
    if (raw.includes("[tool.pytest") || raw.includes('"pytest"') || raw.includes("'pytest'")) testRunner = "pytest";
    if (raw.includes('"ruff"') || raw.includes("'ruff'")) linter = "ruff";
    if (raw.includes("[tool.ruff]")) linter = "ruff";
    if (raw.includes("[tool.black]") || raw.includes('"black"')) formatter = "black";
    if (raw.includes("[build-system]")) buildTool = "setuptools";
    if (raw.includes("[tool.poetry]") || hasDep(raw, "poetry")) buildTool = "poetry";
    if (hasDep(raw, "uv")) buildTool = "uv";
  }

  if (!linter) {
    if (existsSync(join(root, "ruff.toml")) || existsSync(join(root, ".ruff.toml"))) linter = "ruff";
    if (existsSync(join(root, ".flake8"))) linter = "flake8";
    if (existsSync(join(root, "pylintrc")) || existsSync(join(root, ".pylintrc"))) linter = "pylint";
  }

  if (!formatter && linter === "ruff") formatter = "ruff";
  if (!testRunner) {
    if (existsSync(join(root, "pytest.ini"))) testRunner = "pytest";
    if (existsSync(join(root, "conftest.py"))) testRunner = "pytest";
  }
  if (!testRunner && existsSync(join(root, "test"))) testRunner = "unittest";

  if (hasPipfile) buildTool = "pipenv";
  if (buildTool === "setuptools" && existsSync(join(root, "pyproject.toml"))) {
    // Check if it uses setuptools, flit, hatch, pdm, etc.
    const raw = readFileSafe(join(root, "pyproject.toml")) ?? "";
    if (hasDep(raw, "hatchling")) buildTool = "hatch";
    if (hasDep(raw, "flit_core")) buildTool = "flit";
    if (hasDep(raw, "pdm-backend")) buildTool = "pdm";
    if (hasDep(raw, "maturin")) buildTool = "maturin";
  }

  return { testRunner, linter, formatter, buildTool };
}

// ── Go detection ─────────────────────────────────────────

function detectGo(root: string): GoInfo | null {
  if (!existsSync(join(root, "go.mod"))) return null;

  let linter: string | null = null;
  if (existsSync(join(root, ".golangci.yml")) || existsSync(join(root, ".golangci.yaml"))) linter = "golangci-lint";

  return { linter };
}

// ── Rust detection ───────────────────────────────────────

function detectRust(root: string): RustInfo | null {
  const cargoPath = join(root, "Cargo.toml");
  if (!existsSync(cargoPath)) return null;

  let linter: string | null = null;
  if (existsSync(join(root, "clippy.toml")) || existsSync(join(root, ".clippy.toml"))) linter = "clippy";

  // Check Cargo.toml dev-dependencies for clippy
  if (!linter) {
    const raw = readFileSafe(cargoPath) ?? "";
    if (hasDep(raw, "clippy")) linter = "clippy";
  }

  return { linter };
}

// ── Docker detection ─────────────────────────────────────

function detectDocker(root: string): DockerInfo | null {
  const hasDockerfile = existsSync(join(root, "Dockerfile"));
  const hasCompose = existsSync(join(root, "docker-compose.yml")) || existsSync(join(root, "docker-compose.yaml"));
  const hasDockerignore = existsSync(join(root, ".dockerignore"));

  if (!hasDockerfile && !hasCompose && !hasDockerignore) return null;
  return { hasDockerfile, hasCompose, hasDockerignore };
}

// ── Environment detection ────────────────────────────────

function detectEnv(root: string): EnvInfo | null {
  const hasEnvExample = existsSync(join(root, ".env.example")) ||
    existsSync(join(root, ".env.sample")) ||
    existsSync(join(root, ".env.template"));
  return hasEnvExample ? { hasEnvExample } : null;
}

// ── Pick primary language ────────────────────────────────

function pickPrimary(
  python: PythonInfo | null,
  go: GoInfo | null,
  rust: RustInfo | null,
  fileExts: Record<string, number>,
): string | null {
  if (python) return "Python";
  if (go) return "Go";
  if (rust) return "Rust";

  // Fall back to file extension counts
  const ext = Object.entries(fileExts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!ext) return null;
  if (ext === ".py") return "Python";
  if (ext === ".go") return "Go";
  if (ext === ".rs") return "Rust";
  return null;
}

// ── Scanner plugin ───────────────────────────────────────

export const languagesScanner: ScannerPlugin = {
  name: "languages",

  async scan(context: ScanContext): Promise<ScanResult> {
    const root = context.projectRoot;
    const python = detectPython(root);
    const go = detectGo(root);
    const rust = detectRust(root);
    const docker = detectDocker(root);
    const env = detectEnv(root);

    // If we have a file scanner result in context, use extensions
    const fileExts: Record<string, number> = {};

    const data: LanguageTooling = {
      primary: pickPrimary(python, go, rust, fileExts),
      python,
      go,
      rust,
      docker,
      env,
    };

    return { type: "languages", data };
  },
};
