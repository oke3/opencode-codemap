import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scan, generate } from "../../src/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "../fixtures");

describe("multi-tool generator", () => {
  it("generates .cursorrules and copilot-instructions for React project", async () => {
    const model = await scan(resolve(fixtures, "react-app"));
    const files = await generate(model);

    const cursor = files.find((f) => f.path === ".cursorrules");
    const copilot = files.find((f) => f.path === ".github/copilot-instructions.md");

    expect(cursor).toBeDefined();
    expect(cursor!.content).toContain("my-react-app");
    expect(cursor!.content).toContain("Next.js");
    expect(cursor!.content).toContain("ground-zero-portfolio.pages.dev");
    expect(cursor!.overwrite).toBe(false);

    expect(copilot).toBeDefined();
    expect(copilot!.content).toContain("my-react-app");
    expect(copilot!.content).toContain("Next.js");
    expect(copilot!.overwrite).toBe(false);
  });

  it("generates Cursor rules for CLI tool project", async () => {
    const model = await scan(resolve(fixtures, "cli-tool"));
    const files = await generate(model);
    const cursor = files.find((f) => f.path === ".cursorrules");
    expect(cursor).toBeDefined();
    expect(cursor!.content).toContain("CLI");
    expect(cursor!.content).toContain("TypeScript");
  });

  it("generates Copilot instructions for Python project", async () => {
    const model = await scan(resolve(fixtures, "python-app"));
    const files = await generate(model);
    const copilot = files.find((f) => f.path === ".github/copilot-instructions.md");
    expect(copilot).toBeDefined();
    expect(copilot!.content).toContain("Python");
    expect(copilot!.content).toContain("PEP 8");
  });
});
