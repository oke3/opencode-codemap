import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scan, buildProject } from "../../src/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "../fixtures/monorepo");

describe("monorepo detection", () => {
  it("detects monorepo from package.json workspaces", async () => {
    const model = await scan(fixtures);
    expect(model.workspaces).toBeDefined();
    expect(model.workspaces!.length).toBeGreaterThanOrEqual(2);
  });

  it("discovers workspace names", async () => {
    const model = await scan(fixtures);
    const names = model.workspaces!.map((w) => w.name);
    expect(names).toContain("@test/web");
    expect(names).toContain("@test/api");
  });

  it("scans each workspace independently", async () => {
    const model = await scan(fixtures);
    const web = model.workspaces!.find((w) => w.name === "@test/web")!;
    const api = model.workspaces!.find((w) => w.name === "@test/api")!;

    expect(web.model.frameworks.primary).toBe("Next.js");
    expect(web.model.conventions.testRunner).toBe("vitest");
    expect(web.model.conventions.linter).toBe("eslint");
    expect(web.model.conventions.formatter).toBe("prettier");

    expect(api.model.frameworks.primary).toBe("Express");
    expect(api.model.conventions.testRunner).toBe("vitest");
  });
});

describe("monorepo generation", () => {
  it("generates files for root and each workspace", async () => {
    const { model, files } = await buildProject(fixtures);

    // Root files
    expect(files.some((f) => f.path === "AGENTS.md")).toBe(true);
    expect(files.some((f) => f.path === "opencode.json")).toBe(true);

    // Workspace files — path should be prefixed with workspace relative path
    expect(files.some((f) => f.path === "packages/web/AGENTS.md")).toBe(true);
    expect(files.some((f) => f.path === "packages/web/opencode.json")).toBe(true);
    expect(files.some((f) => f.path === "packages/api/AGENTS.md")).toBe(true);
    expect(files.some((f) => f.path === "packages/api/opencode.json")).toBe(true);
  });

  it("root AGENTS.md lists workspaces", async () => {
    const { files } = await buildProject(fixtures);
    const agents = files.find((f) => f.path === "AGENTS.md")!.content;
    expect(agents).toContain("Workspaces");
    expect(agents).toContain("@test/web");
    expect(agents).toContain("@test/api");
  });

  it("workspace AGENTS.md has workspace-specific content", async () => {
    const { files } = await buildProject(fixtures);
    const webAgents = files.find((f) => f.path === "packages/web/AGENTS.md")!.content;
    expect(webAgents).toContain("@test/web");
    expect(webAgents).toContain("Next.js");
    expect(webAgents).not.toContain("Express");

    const apiAgents = files.find((f) => f.path === "packages/api/AGENTS.md")!.content;
    expect(apiAgents).toContain("@test/api");
    expect(apiAgents).toContain("Express");
    expect(apiAgents).not.toContain("Next.js");
  });
});
