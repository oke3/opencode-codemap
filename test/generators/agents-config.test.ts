import { describe, it, expect } from "vitest";
import { scan, generate } from "../../src/index.js";

const fixtures = new URL("../fixtures/react-app", import.meta.url).pathname;

describe("agents-config generator", () => {
  it("generates custom agents for React/TypeScript project", async () => {
    const model = await scan(fixtures);
    const files = await generate(model);
    const reactAgent = files.find((f) => f.path === ".opencode/agents/react-dev.md");
    const typeAgent = files.find((f) => f.path === ".opencode/agents/type-dev.md");
    expect(reactAgent).toBeDefined();
    expect(reactAgent!.content).toContain("React specialist");
    expect(reactAgent!.content).toContain("subagent");
    expect(typeAgent).toBeDefined();
    expect(typeAgent!.content).toContain("TypeScript specialist");
  });
});
