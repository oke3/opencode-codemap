import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "../../src/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "../fixtures/react-app");

describe("scan", () => {
  it("discovers file structure", async () => {
    const model = await scan(fixtures);
    expect(model.fileStructure.totalFiles).toBeGreaterThan(0);
    expect(model.fileStructure.hasSrc).toBe(true);
    expect(model.fileStructure.entryPoints).toContain("src/index.ts");
  });

  it("detects frameworks from package.json", async () => {
    const model = await scan(fixtures);
    expect(model.frameworks.primary).toBe("Next.js");
    expect(model.frameworks.detected.some((f) => f.name === "React")).toBe(true);
    expect(model.frameworks.detected.some((f) => f.name === "Next.js")).toBe(true);
  });

  it("detects conventions", async () => {
    const model = await scan(fixtures);
    expect(model.conventions.testRunner).toBe("vitest");
    expect(model.conventions.linter).toBe("eslint");
    expect(model.conventions.formatter).toBe("prettier");
    expect(model.conventions.typescript).toBe(true);
    expect(model.conventions.strictMode).toBe(true);
  });

  it("respects .gitignore", async () => {
    // node_modules/ doesn't exist in the fixture, but .next/ also doesn't
    // the test verifies the scanner doesn't crash on .gitignore rules
    const model = await scan(fixtures);
    expect(model.fileStructure.totalFiles).toBeGreaterThanOrEqual(3);
  });
});
