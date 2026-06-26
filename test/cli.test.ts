import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { buildProject } from "../src/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "fixtures");

describe("CLI: update command", () => {
  const tmpDir = mkdtempSync("/tmp/codemap-update-test-");
  const fw = resolve(fixtures, "react-app");

  beforeAll(async () => {
    // Generate config files into temp dir
    const { files } = await buildProject(fw);
    for (const file of files) {
      const abs = join(tmpDir, file.path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, file.content, "utf-8");
    }
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("generates files to temp directory", () => {
    expect(existsSync(join(tmpDir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(tmpDir, "opencode.json"))).toBe(true);
  });

  it("reports unchanged files when regenerating with same input", async () => {
    const { files } = await buildProject(fw);
    let unchanged = 0;
    for (const file of files) {
      const abs = join(tmpDir, file.path);
      if (existsSync(abs)) {
        const existing = readFileSync(abs, "utf-8");
        if (existing === file.content) unchanged++;
      }
    }
    // At minimum AGENTS.md and opencode.json should be unchanged
    expect(unchanged).toBeGreaterThanOrEqual(2);
  });

  it("detects updated content when project changes", async () => {
    // Change the project name — this always propagates to generated files
    const pkgPath = join(fw, "package.json");
    const orig = readFileSync(pkgPath, "utf-8");
    const modified = orig.replace('"name": "my-react-app"', '"name": "my-react-app-modified"');
    writeFileSync(pkgPath, modified, "utf-8");

    // Re-scan and check if any file content differs
    const { files } = await buildProject(fw);
    let hasUpdates = false;
    for (const file of files) {
      const abs = join(tmpDir, file.path);
      if (existsSync(abs)) {
        const existing = readFileSync(abs, "utf-8");
        if (existing !== file.content) {
          hasUpdates = true;
          break;
        }
      }
    }

    // Restore original
    writeFileSync(pkgPath, orig, "utf-8");

    expect(hasUpdates).toBe(true);
  });
});
