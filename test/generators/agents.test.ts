import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scan, generate } from "../../src/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "../fixtures");

describe("agents generator", () => {
  it("generates AGENTS.md for a Next.js project", async () => {
    const model = await scan(resolve(fixtures, "react-app"));
    const files = await generate(model);
    expect(files.length).toBeGreaterThan(0);

    const agents = files.find((f) => f.path === "AGENTS.md");
    expect(agents).toBeDefined();
    expect(agents!.content).toContain("# my-react-app");
    expect(agents!.content).toContain("Next.js");
    expect(agents!.content).toContain("TypeScript");
    expect(agents!.content).toContain("vitest");
    expect(agents!.content).toContain("eslint");
    expect(agents!.content).toContain("prettier");
    expect(agents!.content).toContain("@oke3/opencode-codemap");
    expect(agents!.content).toContain("ground-zero-portfolio.pages.dev");
    expect(agents!.overwrite).toBe(true);
  });

  it("generates AGENTS.md for a Python project", async () => {
    const model = await scan(resolve(fixtures, "python-app"));
    const files = await generate(model);
    const agents = files.find((f) => f.path === "AGENTS.md");
    expect(agents).toBeDefined();
    expect(agents!.content).toContain("# python-app");
    expect(agents!.content).toContain("**Python**");
    expect(agents!.content).toContain("pytest");
    expect(agents!.content).toContain("ruff");
  });

  it("generates AGENTS.md for a Go project", async () => {
    const model = await scan(resolve(fixtures, "go-app"));
    const files = await generate(model);
    const agents = files.find((f) => f.path === "AGENTS.md");
    expect(agents).toBeDefined();
    expect(agents!.content).toContain("**Go**");
    expect(agents!.content).toContain("go test");
    expect(agents!.content).toContain("gofmt");
  });

  it("generates AGENTS.md for a Rust project", async () => {
    const model = await scan(resolve(fixtures, "rust-app"));
    const files = await generate(model);
    const agents = files.find((f) => f.path === "AGENTS.md");
    expect(agents).toBeDefined();
    expect(agents!.content).toContain("**Rust**");
    expect(agents!.content).toContain("cargo test");
    expect(agents!.content).toContain("cargo build");
  });

  it("detects CLI tool project from bin field", async () => {
    const model = await scan(resolve(fixtures, "cli-tool"));
    expect(model.frameworks.primary).toBe("CLI");
    expect(model.conventions.testRunner).toBe("vitest");
    expect(model.conventions.linter).toBe("tsc");
  });

  it("generates AGENTS.md for a CLI tool project", async () => {
    const model = await scan(resolve(fixtures, "cli-tool"));
    const files = await generate(model);
    const agents = files.find((f) => f.path === "AGENTS.md");
    expect(agents).toBeDefined();
    expect(agents!.content).toContain("**CLI**");
    expect(agents!.content).toContain("vitest");
    expect(agents!.content).toContain("tsc");
  });

  it("detects Library project from main/exports field", async () => {
    const model = await scan(resolve(fixtures, "ts-lib"));
    expect(model.frameworks.primary).toBe("Library");
    expect(model.conventions.testRunner).toBe("vitest");
  });
});
