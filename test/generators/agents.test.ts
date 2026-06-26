import { describe, it, expect } from "vitest";
import { scan, generate } from "../../src/index.js";

const fixtures = new URL("../fixtures/react-app", import.meta.url).pathname;

describe("agents generator", () => {
  it("generates AGENTS.md for a Next.js project", async () => {
    const model = await scan(fixtures);
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
    expect(agents!.content).toContain("@groundzero/opencode-codemap");
    expect(agents!.overwrite).toBe(true);
  });
});
