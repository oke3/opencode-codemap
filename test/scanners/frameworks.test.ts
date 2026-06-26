import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "../../src/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "../fixtures");

describe("framework scanner", () => {
  it("detects CLI tool from bin field", async () => {
    const model = await scan(resolve(fixtures, "cli-tool"));
    expect(model.frameworks.primary).toBe("CLI");
    expect(model.frameworks.detected.some((f) => f.name === "CLI")).toBe(true);
  });

  it("detects Library from main/exports", async () => {
    const model = await scan(resolve(fixtures, "ts-lib"));
    expect(model.frameworks.primary).toBe("Library");
    expect(model.frameworks.detected.some((f) => f.name === "Library")).toBe(true);
  });

  it("detects Next.js over CLI when both present", async () => {
    // react-app has next + react deps but no bin — should still detect Next.js
    const model = await scan(resolve(fixtures, "react-app"));
    expect(model.frameworks.primary).toBe("Next.js");
    expect(model.frameworks.detected.some((f) => f.name === "CLI")).toBe(false);
  });

  it("does not show language as framework for Python projects", async () => {
    const model = await scan(resolve(fixtures, "python-app"));
    // Python is a language, not a framework — no web framework present
    expect(model.frameworks.primary).toBeNull();
    expect(model.frameworks.detected).toHaveLength(0);
  });

  it("detects tsc linter from package.json lint script", async () => {
    const model = await scan(resolve(fixtures, "cli-tool"));
    expect(model.conventions.linter).toBe("tsc");
  });

  // ── #3: More project types ──────────────────────────────

  it("detects Solid, Lit, React Native from deps", async () => {
    const model = await scan(resolve(fixtures, "fullstack-app"));
    expect(model.frameworks.detected.some((f) => f.name === "Solid")).toBe(true);
    expect(model.frameworks.detected.some((f) => f.name === "Lit")).toBe(true);
    expect(model.frameworks.detected.some((f) => f.name === "React Native")).toBe(true);
  });

  it("detects Tailwind CSS, PostCSS, Prisma, Turbo from config files", async () => {
    const model = await scan(resolve(fixtures, "fullstack-app"));
    expect(model.frameworks.detected.some((f) => f.name === "Tailwind CSS")).toBe(true);
    expect(model.frameworks.detected.some((f) => f.name === "PostCSS")).toBe(true);
    expect(model.frameworks.detected.some((f) => f.name === "Prisma")).toBe(true);
    expect(model.frameworks.detected.some((f) => f.name === "Turbo")).toBe(true);
  });
});
