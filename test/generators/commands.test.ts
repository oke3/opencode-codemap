import { describe, it, expect } from "vitest";
import { scan, generate } from "../../src/index.js";

const fixtures = new URL("../fixtures/react-app", import.meta.url).pathname;

describe("commands generator", () => {
  it("generates commands from package.json scripts", async () => {
    const model = await scan(fixtures);
    const files = await generate(model);
    const test = files.find((f) => f.path === ".opencode/commands/test.md");
    const dev = files.find((f) => f.path === ".opencode/commands/dev.md");
    const build = files.find((f) => f.path === ".opencode/commands/build.md");
    const commit = files.find((f) => f.path === ".opencode/commands/commit.md");
    expect(test).toBeDefined();
    expect(test!.content).toContain("vitest");
    expect(dev).toBeDefined();
    expect(build).toBeDefined();
    expect(commit).toBeDefined();
  });
});
