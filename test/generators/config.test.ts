import { describe, it, expect } from "vitest";
import { scan, generate } from "../../src/index.js";

const fixtures = new URL("../fixtures/react-app", import.meta.url).pathname;

describe("config generator", () => {
  it("generates opencode.json with model and permissions", async () => {
    const model = await scan(fixtures);
    const files = await generate(model);
    const config = files.find((f) => f.path === "opencode.json");
    expect(config).toBeDefined();
    expect(config!.content).toContain("opencode.ai/config.json");
    expect(config!.content).toContain("claude-sonnet");
    expect(config!.content).toContain("claude-haiku");
    expect(config!.content).toContain('"build"');
    expect(config!.overwrite).toBe(false);
  });
});
